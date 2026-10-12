import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import type { Node } from "web-tree-sitter";
import {
  children,
  field,
  namedChildren,
  positionOf,
  walk,
  withTypeScriptTree,
} from "./treeSitter";
import type {
  BackendContractManifest,
  EndpointContract,
  HttpMethod,
  RequestParameter,
  RequestParameterLocation,
  ResponseContract,
  SourceLocation,
  TypeDeclaration,
  TypeProperty,
  TypeShape,
} from "./types";
import { HTTP_METHODS } from "./types";

interface ParsedMethodParameter {
  name: string;
  type: TypeShape;
  decorators: DecoratorInfo[];
  required: boolean;
  source: SourceLocation;
}

interface ParsedMethod {
  name: string;
  decorators: DecoratorInfo[];
  parameters: ParsedMethodParameter[];
  returnType: TypeShape;
  serviceProperty?: string;
  serviceMethod?: string;
  inferredResponse?: TypeShape;
  source: SourceLocation;
}

interface ConstructorService {
  property: string;
  typeName?: string;
}

interface ParsedClass {
  name: string;
  decorators: DecoratorInfo[];
  services: ConstructorService[];
  methods: ParsedMethod[];
  source: SourceLocation;
}

interface ParsedFile {
  relativePath: string;
  source: string;
  declarations: TypeDeclaration[];
  classes: ParsedClass[];
}

type AstValue =
  | { kind: "string"; value: string }
  | { kind: "number"; value: number }
  | { kind: "boolean"; value: boolean }
  | { kind: "null"; value: null }
  | { kind: "identifier"; value: string }
  | { kind: "member"; value: string }
  | { kind: "object"; value: Record<string, AstValue> }
  | { kind: "array"; value: AstValue[] }
  | { kind: "call"; value: { name: string; args: AstValue[] } }
  | { kind: "unknown"; value: string };

interface DecoratorInfo {
  name: string;
  args: AstValue[];
  source: SourceLocation;
}

const HTTP_DECORATORS = new Set<string>(HTTP_METHODS);
const HTTP_STATUS_BY_NAME: Record<string, number> = {
  "HttpStatus.OK": 200,
  "HttpStatus.CREATED": 201,
  "HttpStatus.ACCEPTED": 202,
  "HttpStatus.NO_CONTENT": 204,
  "HttpStatus.BAD_REQUEST": 400,
  "HttpStatus.UNAUTHORIZED": 401,
  "HttpStatus.FORBIDDEN": 403,
  "HttpStatus.NOT_FOUND": 404,
  "HttpStatus.CONFLICT": 409,
};

function normalizeRelativePath(value: string): string {
  return value.replaceAll("\\", "/");
}

function normalizeRoute(value: string): string {
  const normalized = `/${value}`.replaceAll(/\/+/g, "/");
  if (normalized === "/") return normalized;
  return normalized.replace(/\/$/, "");
}

function joinRoute(controllerPath: string, methodPath: string): string {
  return normalizeRoute(`${controllerPath}/${methodPath}`);
}

function sourceLocation(node: Node, file: string): SourceLocation {
  return positionOf(node, file);
}

function parseStringLiteral(value: string): string {
  const quote = value[0];
  const content = value.slice(1, -1);
  if (quote === '"') {
    try {
      return JSON.parse(value) as string;
    } catch {
      return content;
    }
  }

  return content.replaceAll("\\'", "'").replaceAll('\\"', '"');
}

function parseAstValue(node: Node | undefined): AstValue {
  if (!node) return { kind: "unknown", value: "" };

  if (node.type === "string") {
    return { kind: "string", value: parseStringLiteral(node.text) };
  }
  if (node.type === "number") {
    return { kind: "number", value: Number(node.text) };
  }
  if (node.type === "true" || node.text === "true") {
    return { kind: "boolean", value: true };
  }
  if (node.type === "false" || node.text === "false") {
    return { kind: "boolean", value: false };
  }
  if (node.type === "null" || node.text === "null") {
    return { kind: "null", value: null };
  }
  if (node.type === "object") {
    const value: Record<string, AstValue> = {};
    for (const pair of namedChildren(node)) {
      if (pair.type !== "pair") continue;
      const key = field(pair, "key")?.text ?? pair.namedChild(0)?.text;
      const pairValue = field(pair, "value") ?? pair.namedChild(1);
      if (!key || !pairValue) continue;
      value[key.replace(/^['"]|['"]$/g, "")] = parseAstValue(pairValue);
    }
    return { kind: "object", value };
  }
  if (node.type === "array") {
    return {
      kind: "array",
      value: namedChildren(node).map((child) => parseAstValue(child)),
    };
  }
  if (node.type === "call_expression") {
    const functionNode = field(node, "function");
    const args = field(node, "arguments");
    return {
      kind: "call",
      value: {
        name: functionNode?.text ?? "",
        args: args ? namedChildren(args).map((child) => parseAstValue(child)) : [],
      },
    };
  }
  if (node.type === "member_expression") {
    return { kind: "member", value: node.text };
  }
  if (node.type === "identifier" || node.type === "type_identifier") {
    return { kind: "identifier", value: node.text };
  }

  return { kind: "unknown", value: node.text };
}

function decoratorInfo(node: Node, file: string): DecoratorInfo | undefined {
  const expression = node.namedChild(0);
  if (!expression) return undefined;

  if (expression.type === "call_expression") {
    const functionNode = field(expression, "function");
    const args = field(expression, "arguments");
    if (!functionNode) return undefined;
    return {
      name: functionNode.text,
      args: args ? namedChildren(args).map((child) => parseAstValue(child)) : [],
      source: sourceLocation(node, file),
    };
  }

  return {
    name: expression.text,
    args: [],
    source: sourceLocation(node, file),
  };
}

function decoratorsOf(node: Node, file: string): DecoratorInfo[] {
  return namedChildren(node)
    .filter((child) => child.type === "decorator")
    .map((child) => decoratorInfo(child, file))
    .filter((decorator): decorator is DecoratorInfo => decorator !== undefined);
}

function findDecorator(
  decorators: DecoratorInfo[],
  name: string,
): DecoratorInfo | undefined {
  return decorators.find((decorator) => decorator.name === name);
}

function literalString(value: AstValue | undefined): string | undefined {
  return value?.kind === "string" ? value.value : undefined;
}

function literalNumber(value: AstValue | undefined): number | undefined {
  if (value?.kind === "number") return value.value;
  if (value?.kind === "member") return HTTP_STATUS_BY_NAME[value.value];
  if (value?.kind === "identifier") return HTTP_STATUS_BY_NAME[value.value];
  return undefined;
}

function parseTypeNode(node: Node | undefined): TypeShape {
  if (!node) return { kind: "unknown", sourceText: "unknown" };

  if (node.type === "type_annotation") {
    return parseTypeNode(field(node, "type") ?? node.namedChild(0) ?? undefined);
  }
  if (node.type === "predefined_type") {
    const name = node.text;
    if (name === "null") return { kind: "literal", value: null, sourceText: name };
    return { kind: "primitive", name, sourceText: name };
  }
  if (node.type === "type_identifier" || node.type === "nested_type_identifier") {
    return { kind: "reference", name: node.text, sourceText: node.text };
  }
  if (node.type === "array_type") {
    return {
      kind: "array",
      element: parseTypeNode(field(node, "type") ?? node.namedChild(0) ?? undefined),
      sourceText: node.text,
    };
  }
  if (node.type === "tuple_type") {
    return {
      kind: "tuple",
      elements: namedChildren(node).map((child) => parseTypeNode(child)),
      sourceText: node.text,
    };
  }
  if (node.type === "generic_type") {
    const nameNode = field(node, "name") ?? node.namedChild(0);
    const argumentsNode = field(node, "type_arguments");
    return {
      kind: "reference",
      name: nameNode?.text ?? node.text,
      args: argumentsNode
        ? namedChildren(argumentsNode).map((child) => parseTypeNode(child))
        : [],
      sourceText: node.text,
    };
  }
  if (node.type === "union_type" || node.type === "intersection_type") {
    const variants = namedChildren(node).map((child) => parseTypeNode(child));
    return {
      kind: node.type === "intersection_type" ? "intersection" : "union",
      variants,
      nullable: variants.some((variant) => variant.kind === "literal" && variant.value === null),
      sourceText: node.text,
    };
  }
  if (node.type === "literal_type") {
    const value = parseAstValue(node.namedChild(0) ?? undefined);
    if (value.kind === "string" || value.kind === "number" || value.kind === "boolean") {
      return { kind: "literal", value: value.value, sourceText: node.text };
    }
    if (node.text === "null") return { kind: "literal", value: null, sourceText: node.text };
    return { kind: "literal", value: node.text, sourceText: node.text };
  }
  if (node.type === "object_type") {
    return {
      kind: "object",
      properties: parsePropertiesFromBody(node),
      sourceText: node.text,
    };
  }
  if (node.type === "parenthesized_type") {
    return parseTypeNode(field(node, "type") ?? node.namedChild(0) ?? undefined);
  }
  if (node.type === "optional_type") {
    return {
      kind: "union",
      variants: [parseTypeNode(node.namedChild(0) ?? undefined), { kind: "primitive", name: "undefined" }],
      sourceText: node.text,
    };
  }
  if (node.type === "type_query" || node.type === "this_type") {
    return { kind: "reference", name: node.text, sourceText: node.text };
  }

  return { kind: "unknown", sourceText: node.text };
}

function propertyName(node: Node): string | undefined {
  const nameNode = field(node, "name") ?? node.namedChildren.find((child) => {
    if (!child) return false;
    return ["property_identifier", "private_property_identifier", "identifier"].includes(child.type);
  });
  if (!nameNode) return undefined;
  return nameNode.text.replace(/\?$/, "");
}

function propertyIsOptional(node: Node): boolean {
  const name = propertyName(node);
  if (!name) return false;
  const nameNode = field(node, "name");
  return Boolean(nameNode?.text.endsWith("?")) || children(node).some((child) => child.type === "?");
}

function parseProperty(node: Node): TypeProperty | undefined {
  if (![
    "public_field_definition",
    "property_definition",
    "property_signature",
  ].includes(node.type)) {
    return undefined;
  }

  const name = propertyName(node);
  if (!name) return undefined;
  return {
    name,
    optional: propertyIsOptional(node) || field(node, "value") !== undefined,
    type: parseTypeNode(field(node, "type") ?? undefined),
  };
}

function parsePropertiesFromBody(body: Node | undefined): TypeProperty[] {
  if (!body) return [];
  return namedChildren(body)
    .map((child) => parseProperty(child))
    .filter((property): property is TypeProperty => property !== undefined);
}

function parseTypeParameters(node: Node): string[] {
  const parameters = field(node, "type_parameters");
  if (!parameters) return [];
  return namedChildren(parameters)
    .map((child) =>
      child.type === "type_parameter" ? field(child, "name")?.text ?? child.text : child.text,
    )
    .filter((name) => /^[A-Za-z_$][\w$]*$/.test(name));
}

function parseExtends(node: Node): string[] {
  const header = node.text.slice(0, node.text.indexOf("{") >= 0 ? node.text.indexOf("{") : node.text.length);
  const match = /extends\s+([^\s{]+)/.exec(header);
  return match ? [match[1].replace(/<.*$/, "")] : [];
}

function parseEnumValues(body: Node | undefined): Array<string | number> {
  if (!body) return [];
  const values: Array<string | number> = [];
  for (const member of namedChildren(body)) {
    if (!["enum_member", "enum_assignment"].includes(member.type)) continue;
    const name = field(member, "name") ?? member.namedChild(0);
    const value = field(member, "value") ?? member.namedChild(1);
    if (value) {
      const parsed = parseAstValue(value);
      if (parsed.kind === "string" || parsed.kind === "number") values.push(parsed.value);
      else if (name) values.push(name.text);
    } else if (name) {
      values.push(name.text);
    }
  }
  return values;
}

function parseDeclaration(node: Node, file: string): TypeDeclaration | undefined {
  const name = field(node, "name")?.text;
  if (!name) return undefined;

  if (node.type === "class_declaration") {
    return {
      name,
      kind: "class",
      source: sourceLocation(node, file),
      typeParameters: parseTypeParameters(node),
      fields: parsePropertiesFromBody(field(node, "body") ?? undefined),
      extends: parseExtends(node),
    };
  }

  if (node.type === "interface_declaration") {
    return {
      name,
      kind: "interface",
      source: sourceLocation(node, file),
      typeParameters: parseTypeParameters(node),
      fields: parsePropertiesFromBody(field(node, "body") ?? undefined),
      extends: parseExtends(node),
    };
  }

  if (node.type === "type_alias_declaration") {
    return {
      name,
      kind: "type",
      source: sourceLocation(node, file),
      typeParameters: parseTypeParameters(node),
      fields: [],
      alias: parseTypeNode(field(node, "value") ?? undefined),
    };
  }

  if (node.type === "enum_declaration") {
    return {
      name,
      kind: "enum",
      source: sourceLocation(node, file),
      typeParameters: [],
      fields: [],
      enumValues: parseEnumValues(field(node, "body") ?? undefined),
    };
  }

  return undefined;
}

function methodParameter(node: Node, file: string): ParsedMethodParameter | undefined {
  if (!["required_parameter", "optional_parameter"].includes(node.type)) return undefined;
  const pattern = field(node, "pattern") ?? node.namedChild(0);
  if (!pattern) return undefined;

  return {
    name: pattern.text.replace(/\?$/, ""),
    type: parseTypeNode(field(node, "type") ?? undefined),
    decorators: decoratorsOf(node, file),
    required:
      node.type === "required_parameter" &&
      !pattern.text.endsWith("?") &&
      field(node, "value") === undefined,
    source: sourceLocation(node, file),
  };
}

function inferExpressionShape(node: Node | undefined): TypeShape {
  if (!node) return { kind: "unknown" };
  if (node.type === "object") {
    const properties: TypeProperty[] = [];
    for (const pair of namedChildren(node)) {
      if (pair.type !== "pair") continue;
      const name = (field(pair, "key") ?? pair.namedChild(0))?.text;
      const value = field(pair, "value") ?? pair.namedChild(1);
      if (!name) continue;
      properties.push({
        name: name.replace(/^['"]|['"]$/g, ""),
        optional: false,
        type: inferExpressionShape(value ?? undefined),
      });
    }
    return { kind: "object", properties };
  }
  if (node.type === "array") {
    const values = namedChildren(node);
    return {
      kind: "array",
      element: values.length ? inferExpressionShape(values[0]) : { kind: "unknown" },
    };
  }
  if (node.type === "string" || node.type === "template_string") return { kind: "primitive", name: "string" };
  if (node.type === "number") return { kind: "primitive", name: "number" };
  if (node.type === "true" || node.type === "false") return { kind: "primitive", name: "boolean" };
  return { kind: "unknown", sourceText: node.text };
}

function inferSuccessResponse(methodNode: Node): TypeShape | undefined {
  let inferred: TypeShape | undefined;
  walk(methodNode, (node) => {
    if (inferred || node.type !== "call_expression") return;
    const functionName = field(node, "function")?.text;
    if (functionName !== "success" && functionName !== "arraySuccess") return;
    const argumentsNode = field(node, "arguments");
    const firstArgument = argumentsNode ? namedChildren(argumentsNode)[0] : undefined;
    if (firstArgument) inferred = inferExpressionShape(firstArgument);
  });
  return inferred;
}

function extractServiceCall(
  methodNode: Node,
  serviceProperties: Set<string>,
): { property: string; method: string } | undefined {
  let result: { property: string; method: string } | undefined;
  walk(methodNode, (node) => {
    if (result || node.type !== "call_expression") return;
    const functionNode = field(node, "function");
    if (!functionNode || functionNode.type !== "member_expression") return;
    const methodName = field(functionNode, "property")?.text;
    const object = field(functionNode, "object");
    if (!methodName || !object || object.type !== "member_expression") return;
    const objectBase = field(object, "object")?.text;
    const serviceProperty = field(object, "property")?.text;
    if (objectBase === "this" && serviceProperty && serviceProperties.has(serviceProperty)) {
      result = { property: serviceProperty, method: methodName };
    }
  });
  return result;
}

function constructorServices(node: Node): ConstructorService[] {
  const body = field(node, "body");
  const constructor = body
    ? namedChildren(body).find(
        (child) => child.type === "method_definition" && field(child, "name")?.text === "constructor",
      )
    : undefined;
  if (!constructor) return [];
  const parameters = field(constructor, "parameters");
  if (!parameters) return [];

  return namedChildren(parameters)
    .filter((parameter) => parameter.type === "required_parameter")
    .map((parameter) => {
      const pattern = field(parameter, "pattern") ?? parameter.namedChild(0);
      const type = parseTypeNode(field(parameter, "type") ?? undefined);
      return {
        property: pattern?.text ?? parameter.text,
        typeName: type.kind === "reference" ? type.name : undefined,
      };
    })
    .filter((service) => Boolean(service.property));
}

function parseClass(
  node: Node,
  decorators: DecoratorInfo[],
  file: string,
): ParsedClass | undefined {
  const name = field(node, "name")?.text;
  if (!name) return undefined;

  const services = constructorServices(node);
  const serviceProperties = new Set(services.map((service) => service.property));
  const body = field(node, "body");
  const methods: ParsedMethod[] = [];
  let pendingDecorators: DecoratorInfo[] = [];

  for (const child of body ? namedChildren(body) : []) {
    if (child.type === "decorator") {
      const decorator = decoratorInfo(child, file);
      if (decorator) pendingDecorators.push(decorator);
      continue;
    }
    if (child.type !== "method_definition") continue;
    const methodName = field(child, "name")?.text;
    if (!methodName || methodName === "constructor") continue;
    const parameters = field(child, "parameters");
    const parsedParameters = parameters
      ? namedChildren(parameters)
          .map((parameter) => methodParameter(parameter, file))
          .filter((parameter): parameter is ParsedMethodParameter => parameter !== undefined)
      : [];
    const serviceCall = extractServiceCall(child, serviceProperties);
    methods.push({
      name: methodName,
      decorators: [...pendingDecorators, ...decoratorsOf(child, file)],
      parameters: parsedParameters,
      returnType: parseTypeNode(field(child, "return_type") ?? undefined),
      serviceProperty: serviceCall?.property,
      serviceMethod: serviceCall?.method,
      inferredResponse: inferSuccessResponse(child),
      source: sourceLocation(child, file),
    });
    pendingDecorators = [];
  }

  return { name, decorators, services, methods, source: sourceLocation(node, file) };
}

function topLevelDeclaration(node: Node): { declaration: Node; decorators: Node[] } | undefined {
  if (node.type === "export_statement") {
    const declaration = field(node, "declaration");
    return declaration ? { declaration, decorators: namedChildren(node).filter((child) => child.type === "decorator") } : undefined;
  }
  if (["class_declaration", "interface_declaration", "type_alias_declaration", "enum_declaration"].includes(node.type)) {
    return { declaration: node, decorators: [] };
  }
  return undefined;
}

async function parseFile(filePath: string, backendRoot: string): Promise<ParsedFile> {
  const source = await readFile(filePath, "utf8");
  const relativePath = normalizeRelativePath(relative(backendRoot, filePath));

  return withTypeScriptTree(source, (root) => {
    const declarations: TypeDeclaration[] = [];
    const classes: ParsedClass[] = [];
    for (const topLevel of namedChildren(root)) {
      const item = topLevelDeclaration(topLevel);
      if (!item) continue;
      const declaration = parseDeclaration(item.declaration, relativePath);
      if (declaration) declarations.push(declaration);
      if (item.declaration.type === "class_declaration") {
        const classInfo = parseClass(
          item.declaration,
          [
            ...decoratorsOf(topLevel, relativePath),
            ...decoratorsOf(item.declaration, relativePath),
          ],
          relativePath,
        );
        if (classInfo) classes.push(classInfo);
      }
    }
    return { relativePath, source, declarations, classes };
  });
}

async function listTypeScriptFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "uploads") continue;
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listTypeScriptFiles(absolutePath)));
      continue;
    }
    if (
      entry.isFile() &&
      extname(entry.name) === ".ts" &&
      !entry.name.endsWith(".spec.ts") &&
      !entry.name.endsWith(".d.ts")
    ) {
      files.push(absolutePath);
    }
  }
  return files.sort();
}

function parseRouteDecorator(method: ParsedMethod): { method: HttpMethod; path: string } | undefined {
  const decorator = method.decorators.find((item) => HTTP_DECORATORS.has(item.name.toUpperCase()));
  if (!decorator) return undefined;
  return {
    method: decorator.name.toUpperCase() as HttpMethod,
    path: literalString(decorator.args[0]) ?? "",
  };
}

function shapeFromSwaggerValue(value: AstValue | undefined): TypeShape | undefined {
  if (!value) return undefined;
  if (value.kind === "identifier" || value.kind === "member") {
    const primitiveNames: Record<string, string> = {
      String: "string",
      Number: "number",
      Boolean: "boolean",
      Object: "object",
    };
    if (primitiveNames[value.value]) return { kind: "primitive", name: primitiveNames[value.value] };
    return { kind: "reference", name: value.value };
  }
  if (value.kind === "array") {
    return { kind: "array", element: shapeFromSwaggerValue(value.value[0]) ?? { kind: "unknown" } };
  }
  return undefined;
}

function schemaFromSwaggerValue(value: AstValue | undefined): TypeShape | undefined {
  if (!value || value.kind !== "object") return undefined;
  const typeValue = value.value.type;
  const typeName = typeValue?.kind === "string" ? typeValue.value : undefined;
  if (typeName === "string" || typeName === "number" || typeName === "integer" || typeName === "boolean") {
    return { kind: "primitive", name: typeName === "integer" ? "number" : typeName };
  }
  if (typeName === "array") {
    return { kind: "array", element: schemaFromSwaggerValue(value.value.items) ?? { kind: "unknown" } };
  }
  const properties = value.value.properties;
  if (typeName === "object" || properties?.kind === "object") {
    const required = new Set(
      value.value.required?.kind === "array"
        ? value.value.required.value.flatMap((item) => (item.kind === "string" ? [item.value] : []))
        : [],
    );
    const parsedProperties =
      properties?.kind === "object"
        ? Object.entries(properties.value).map(([name, propertySchema]) => ({
            name,
            optional: !required.has(name),
            type: schemaFromSwaggerValue(propertySchema) ?? { kind: "unknown" },
          }))
        : [];
    return { kind: "object", properties: parsedProperties };
  }
  return undefined;
}

function swaggerResponse(method: ParsedMethod):
  | { status?: number; type?: TypeShape; contentType?: string; description?: string }
  | undefined {
  const responses = method.decorators.filter((decorator) => decorator.name === "ApiResponse");
  const success = responses.find((response) => {
    const options = response.args[0];
    const status = options?.kind === "object" ? literalNumber(options.value.status) : undefined;
    return status === undefined || (status >= 200 && status < 300);
  });
  if (!success) return undefined;

  const options = success.args[0];
  if (options?.kind !== "object") return undefined;
  const content = options.value.content;
  const contentType = content?.kind === "object" ? Object.keys(content.value)[0] : undefined;
  if (contentType?.startsWith("image/")) {
    return {
      status: literalNumber(options.value.status),
      type: { kind: "binary" },
      contentType,
      description: literalString(options.value.description),
    };
  }

  const type = shapeFromSwaggerValue(options.value.type) ?? schemaFromSwaggerValue(options.value.schema);
  return {
    status: literalNumber(options.value.status),
    type,
    contentType: type?.kind === "binary" ? "application/octet-stream" : "application/json",
    description: literalString(options.value.description),
  };
}

function unwrapResponseShape(shape: TypeShape): TypeShape {
  if (shape.kind !== "reference") return shape;
  const name = shape.name?.split(".").at(-1);
  if (name === "Promise" || name === "Result" || name === "ArrayResult" || name === "PromiseLike") {
    return unwrapResponseShape(shape.args?.[0] ?? { kind: "unknown" });
  }
  if (name === "StreamableFile" || name === "Buffer") return { kind: "binary" };
  return shape;
}

function isUnknownShape(shape: TypeShape | undefined): boolean {
  if (!shape) return true;
  if (shape.kind === "unknown") return true;
  if (shape.kind === "primitive") return ["unknown", "any"].includes(shape.name ?? "");
  return shape.kind === "reference" && ["unknown", "any", "Object"].includes(shape.name ?? "");
}

function containsUnknownShape(shape: TypeShape | undefined): boolean {
  if (isUnknownShape(shape)) return true;
  if (shape?.kind === "array") return containsUnknownShape(shape.element);
  if (shape?.kind === "tuple") return shape.elements?.some(containsUnknownShape) ?? false;
  if (shape?.kind === "object") {
    return shape.properties?.some((property) => containsUnknownShape(property.type)) ?? false;
  }
  if (shape?.kind === "union" || shape?.kind === "intersection") {
    return shape.variants?.some(containsUnknownShape) ?? false;
  }
  if (shape?.kind === "reference") return shape.args?.some(containsUnknownShape) ?? false;
  return false;
}

function defaultStatus(method: HttpMethod): number {
  return method === "POST" ? 201 : method === "DELETE" ? 200 : 200;
}

function parameterTypeFromDeclaration(
  shape: TypeShape,
  name: string,
  declarations: Map<string, TypeDeclaration>,
  seen = new Set<string>(),
): TypeShape {
  if (shape.kind !== "reference" || !shape.name || seen.has(shape.name)) return { kind: "unknown" };
  const declaration = declarations.get(shape.name);
  if (!declaration) return { kind: "unknown" };
  const property = declaration.fields.find((candidate) => candidate.name === name);
  if (property) return property.type;

  const nextSeen = new Set(seen).add(shape.name);
  for (const baseName of declaration.extends ?? []) {
    const inherited = parameterTypeFromDeclaration(
      { kind: "reference", name: baseName },
      name,
      declarations,
      nextSeen,
    );
    if (inherited.kind !== "unknown") return inherited;
  }
  return { kind: "unknown" };
}

function requestParameters(
  method: ParsedMethod,
  path: string,
  declarations: Map<string, TypeDeclaration>,
): RequestParameter[] {
  const parameters: RequestParameter[] = [];
  const routeParams = [...path.matchAll(/:([A-Za-z_$][\w$]*)/g)].map((match) => match[1]);

  for (const parameter of method.parameters) {
    const decorator = parameter.decorators.find((item) =>
      ["Param", "Query", "Body", "UploadedFiles", "UploadedFile"].includes(item.name),
    );
    if (!decorator) continue;

    const namedField = literalString(decorator.args[0]);
    const location: RequestParameterLocation =
      decorator.name === "Param"
        ? "path"
        : decorator.name === "Query"
          ? "query"
          : decorator.name === "Body"
            ? "body"
            : "formData";

    if (location === "path" && !namedField && routeParams.length > 0) {
      for (const routeParam of routeParams) {
        parameters.push({
          name: routeParam,
          location,
          required: true,
          type: parameterTypeFromDeclaration(parameter.type, routeParam, declarations),
          field: routeParam,
          source: parameter.source,
        });
      }
      continue;
    }

    if (location === "formData") {
      const interceptorDecorator = method.decorators.find((item) => item.name === "UseInterceptors");
      const interceptorCall = interceptorDecorator?.args.find(
        (arg) =>
          arg.kind === "call" &&
          (arg.value.name === "FilesInterceptor" || arg.value.name === "FileInterceptor"),
      );
      const interceptorField =
        interceptorCall?.kind === "call" ? literalString(interceptorCall.value.args[0]) : undefined;
      parameters.push({
        name: parameter.name,
        location,
        required: parameter.required,
        type: { kind: "array", element: { kind: "unknown" } },
        field: namedField ?? interceptorField ?? "files",
        source: parameter.source,
      });
      continue;
    }

    parameters.push({
      name: namedField ?? parameter.name,
      location,
      required: location === "query" ? false : parameter.required,
      type: parameter.type,
      field: namedField,
      source: parameter.source,
    });
  }

  return parameters;
}

function endpointResponse(
  method: ParsedMethod,
  controller: ParsedClass,
  serviceClass: ParsedClass | undefined,
  swagger: ReturnType<typeof swaggerResponse>,
  httpMethod: HttpMethod,
): ResponseContract {
  const serviceMethod =
    serviceClass && method.serviceMethod
      ? serviceClass.methods.find((candidate) => candidate.name === method.serviceMethod)
      : undefined;
  const controllerType = unwrapResponseShape(method.returnType);
  const serviceType = serviceMethod ? unwrapResponseShape(serviceMethod.returnType) : undefined;
  const serviceIsBinary = controllerType.kind === "binary" || serviceType?.kind === "binary";

  let type: TypeShape = serviceIsBinary
    ? { kind: "binary" }
    : serviceType ?? controllerType;
  let source: ResponseContract["source"] = serviceMethod ? "service" : "controller";

  if (isUnknownShape(type) && serviceMethod?.inferredResponse) {
    type = serviceMethod.inferredResponse;
    source = "inferred";
  }
  if (isUnknownShape(type) && method.inferredResponse) {
    type = method.inferredResponse;
    source = "inferred";
  }
  if (isUnknownShape(type) && swagger?.type) {
    type = swagger.type;
    source = "swagger";
  }
  if (swagger?.type?.kind === "binary") {
    type = swagger.type;
    source = "swagger";
  }

  const statusFromDecorator = method.decorators.find((item) => item.name === "HttpCode");
  const status =
    (statusFromDecorator ? literalNumber(statusFromDecorator.args[0]) : undefined) ??
    swagger?.status ??
    defaultStatus(httpMethod);
  const warnings: string[] = [];
  if (isUnknownShape(type)) {
    warnings.push(
      `${controller.name}.${method.name}: no se pudo inferir la estructura de la respuesta; se conserva unknown.`,
    );
  }

  return {
    status,
    contentType: swagger?.contentType ?? (type.kind === "binary" ? "application/octet-stream" : "application/json"),
    type,
    source,
    description: swagger?.description,
  };
}

function controllerEndpoints(
  classes: ParsedClass[],
  declarations: Map<string, TypeDeclaration>,
): EndpointContract[] {
  const classesByName = new Map(classes.map((item) => [item.name, item]));
  const endpoints: EndpointContract[] = [];

  for (const controller of classes) {
    const controllerDecorator = findDecorator(controller.decorators, "Controller");
    if (!controllerDecorator) continue;
    const controllerPath = literalString(controllerDecorator.args[0]) ?? "";
    const rolesDecorator = findDecorator(controller.decorators, "Roles");
    const classRoles =
      rolesDecorator?.args.flatMap((arg) => (arg.kind === "string" ? [arg.value] : [])) ?? [];
    const classIsPublic = Boolean(findDecorator(controller.decorators, "Public"));

    for (const method of controller.methods) {
      const route = parseRouteDecorator(method);
      if (!route) continue;
      const path = joinRoute(controllerPath, route.path);
      const service = method.serviceProperty
        ? controller.services.find((candidate) => candidate.property === method.serviceProperty)
        : undefined;
      const serviceClass = service?.typeName ? classesByName.get(service.typeName) : undefined;
      const swagger = swaggerResponse(method);
      const response = endpointResponse(method, controller, serviceClass, swagger, route.method);
      const operation = findDecorator(method.decorators, "ApiOperation");
      const operationValue = operation?.args[0];
      const summary =
        operationValue?.kind === "object"
          ? literalString(operationValue.value.summary)
          : literalString(operationValue);
      const warnings: string[] = [];
      if (!serviceClass && method.serviceProperty) {
        warnings.push(
          `${controller.name}.${method.name}: no se encontró la clase del servicio ${method.serviceProperty}.`,
        );
      }
      if (containsUnknownShape(response.type)) {
        warnings.push(
          `${controller.name}.${method.name}: la respuesta contiene unknown/any y requiere verificación runtime.`,
        );
      }

      endpoints.push({
        id: `${route.method} ${path}`,
        method: route.method,
        path,
        clientPath: path.replace(/^\/api(?=\/|$)/, "") || "/",
        controller: controller.name,
        handler: method.name,
        service: service?.typeName,
        serviceMethod: method.serviceMethod,
        summary,
        auth:
          classIsPublic || Boolean(findDecorator(method.decorators, "Public")) ? "public" : "required",
        roles: classRoles,
        request: { parameters: requestParameters(method, path, declarations) },
        response,
        source: method.source,
        warnings,
      });
    }
  }

  return endpoints.sort((left, right) => left.id.localeCompare(right.id));
}

export async function analyzeBackend(backendRootInput: string): Promise<BackendContractManifest> {
  const backendRoot = resolve(backendRootInput);
  const sourceRoot = resolve(backendRoot, "src");
  const filePaths = await listTypeScriptFiles(sourceRoot);
  const parsedFiles: ParsedFile[] = [];

  for (const filePath of filePaths) {
    parsedFiles.push(await parseFile(filePath, backendRoot));
  }

  const declarations = parsedFiles.flatMap((file) => file.declarations);
  const classes = parsedFiles.flatMap((file) => file.classes);
  const declarationsByName = new Map<string, TypeDeclaration>();
  const warnings: string[] = [];

  for (const declaration of declarations) {
    if (declarationsByName.has(declaration.name)) {
      warnings.push(
        `Se encontraron varias declaraciones llamadas ${declaration.name}; se usará la primera para resolver referencias.`,
      );
      continue;
    }
    declarationsByName.set(declaration.name, declaration);
  }

  const endpoints = controllerEndpoints(classes, declarationsByName);
  const sourceHash = createHash("sha256");
  for (const file of parsedFiles) {
    sourceHash.update(file.relativePath);
    sourceHash.update("\0");
    sourceHash.update(file.source);
    sourceHash.update("\0");
  }

  return {
    schemaVersion: 1,
    generator: "backend-contract-inspector",
    backend: {
      root: normalizeRelativePath(relative(process.cwd(), backendRoot) || "."),
      framework: "nestjs",
      parser: "tree-sitter-typescript",
    },
    sourceHash: sourceHash.digest("hex"),
    declarations: [...declarationsByName.values()].sort((left, right) => left.name.localeCompare(right.name)),
    endpoints,
    warnings: [...warnings, ...endpoints.flatMap((endpoint) => endpoint.warnings)],
  };
}

export function unwrapShapeForGeneratedType(shape: TypeShape): TypeShape {
  return unwrapResponseShape(shape);
}
