export const HTTP_METHODS = ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"] as const;

export type HttpMethod = (typeof HTTP_METHODS)[number];

export type TypeShapeKind =
  | "unknown"
  | "primitive"
  | "reference"
  | "array"
  | "tuple"
  | "object"
  | "union"
  | "intersection"
  | "literal"
  | "binary";

export interface SourceLocation {
  file: string;
  line: number;
  column: number;
}

export interface TypeProperty {
  name: string;
  optional: boolean;
  type: TypeShape;
}

export interface TypeShape {
  kind: TypeShapeKind;
  name?: string;
  args?: TypeShape[];
  element?: TypeShape;
  elements?: TypeShape[];
  properties?: TypeProperty[];
  variants?: TypeShape[];
  value?: string | number | boolean | null;
  nullable?: boolean;
  sourceText?: string;
}

export interface TypeDeclaration {
  name: string;
  kind: "class" | "interface" | "type" | "enum";
  source: SourceLocation;
  typeParameters: string[];
  fields: TypeProperty[];
  alias?: TypeShape;
  extends?: string[];
  enumValues?: Array<string | number>;
}

export type RequestParameterLocation = "path" | "query" | "body" | "formData";

export interface RequestParameter {
  name: string;
  location: RequestParameterLocation;
  required: boolean;
  type: TypeShape;
  field?: string;
  source: SourceLocation;
}

export interface RequestContract {
  parameters: RequestParameter[];
}

export interface ResponseContract {
  status: number;
  contentType: string;
  type: TypeShape;
  source: "service" | "swagger" | "controller" | "inferred" | "unknown";
  description?: string;
}

export interface EndpointContract {
  id: string;
  method: HttpMethod;
  path: string;
  clientPath: string;
  controller: string;
  handler: string;
  service?: string;
  serviceMethod?: string;
  summary?: string;
  auth: "required" | "public";
  roles: string[];
  request: RequestContract;
  response: ResponseContract;
  source: SourceLocation;
  warnings: string[];
}

export interface BackendContractManifest {
  schemaVersion: 1;
  generator: "backend-contract-inspector";
  backend: {
    root: string;
    framework: "nestjs";
    parser: "tree-sitter-typescript";
  };
  sourceHash: string;
  declarations: TypeDeclaration[];
  endpoints: EndpointContract[];
  warnings: string[];
}

export interface ProbeRequest {
  method: HttpMethod;
  path: string;
  url: string;
  query: Record<string, unknown>;
  pathParams: Record<string, string | number>;
  body?: unknown;
}

export interface ProbeResponse {
  status: number;
  headers: Record<string, string>;
  body: unknown;
}

export interface ProbeResult {
  endpointId: string;
  request: ProbeRequest;
  response: ProbeResponse;
}
