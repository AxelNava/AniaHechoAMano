import { createRequire } from "node:module";
import { Language, Node, Parser } from "web-tree-sitter";

const require = createRequire(import.meta.url);

let parserPromise: Promise<Parser> | undefined;

async function getParser(): Promise<Parser> {
  parserPromise ??= (async () => {
    await Parser.init({
      locateFile: (fileName: string) => require.resolve(`web-tree-sitter/${fileName}`),
    });

    const language = await Language.load(
      require.resolve("tree-sitter-typescript/tree-sitter-typescript.wasm"),
    );
    const parser = new Parser();
    parser.setLanguage(language);
    return parser;
  })();

  return parserPromise;
}

export async function withTypeScriptTree<T>(
  source: string,
  visitor: (root: Node) => T,
): Promise<T> {
  const parser = await getParser();
  parser.reset();
  const tree = parser.parse(source);

  if (!tree) {
    throw new Error("Tree-sitter no pudo crear el árbol sintáctico de TypeScript.");
  }

  try {
    return visitor(tree.rootNode);
  } finally {
    tree.delete();
  }
}

export function namedChildren(node: Node): Node[] {
  return node.namedChildren.filter((child): child is Node => child !== null);
}

export function children(node: Node): Node[] {
  return node.children.filter((child): child is Node => child !== null);
}

export function field(node: Node, name: string): Node | undefined {
  return node.childForFieldName(name) ?? undefined;
}

export function positionOf(node: Node, file: string) {
  return {
    file,
    line: node.startPosition.row + 1,
    column: node.startPosition.column + 1,
  };
}

export function walk(node: Node, visitor: (current: Node) => void): void {
  visitor(node);
  for (const child of namedChildren(node)) {
    walk(child, visitor);
  }
}
