import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import ts from "typescript";
import {
  buildSchema,
  Kind,
  parse,
  validate,
  type GraphQLSchema,
  type OperationTypeNode,
} from "graphql";

const appRoot = path.resolve(import.meta.dir, "..");
const schemaPath = path.join(appRoot, "graphql", "indexer", "schema.graphql");

const includedExtensions = new Set([".ts", ".tsx", ".mts"]);
const ignoredDirectoryNames = new Set([
  ".git",
  ".next",
  "build",
  "dist",
  "node_modules",
  "out",
]);

const ignoredFilePaths = new Set([
  path.join(appRoot, "graphql", "indexer", "env.d.ts"),
]);

type ValidationProblem = {
  filePath: string;
  line: number;
  column: number;
  message: string;
};

async function collectSourceFiles(directoryPath: string): Promise<string[]> {
  const directoryEntries = await readdir(directoryPath, { withFileTypes: true });
  const filePaths: string[] = [];

  for (const entry of directoryEntries) {
    const entryPath = path.join(directoryPath, entry.name);

    if (entry.isDirectory()) {
      if (ignoredDirectoryNames.has(entry.name)) {
        continue;
      }

      filePaths.push(...(await collectSourceFiles(entryPath)));
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (!includedExtensions.has(path.extname(entry.name))) {
      continue;
    }

    if (ignoredFilePaths.has(entryPath)) {
      continue;
    }

    filePaths.push(entryPath);
  }

  return filePaths;
}

function getDocumentText(argument: ts.Expression): string | null {
  if (ts.isNoSubstitutionTemplateLiteral(argument)) {
    return argument.text;
  }

  if (ts.isStringLiteral(argument)) {
    return argument.text;
  }

  return null;
}

function collectGraphQLProblems(
  sourceFile: ts.SourceFile,
  schema: GraphQLSchema,
): ValidationProblem[] {
  const problems: ValidationProblem[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "graphql"
    ) {
      const [firstArgument] = node.arguments;

      if (!firstArgument) {
        return;
      }

      const position = sourceFile.getLineAndCharacterOfPosition(firstArgument.getStart(sourceFile));
      const documentText = getDocumentText(firstArgument);

      if (documentText === null) {
        problems.push({
          filePath: sourceFile.fileName,
          line: position.line + 1,
          column: position.character + 1,
          message:
            "graphql() must receive a static string or no-substitution template literal so validation can run.",
        });
        return;
      }

      try {
        const document = parse(documentText);

        for (const definition of document.definitions) {
          if (definition.kind !== Kind.OPERATION_DEFINITION) {
            continue;
          }

          const rootType = getRootTypeForOperation(schema, definition.operation);

          if (rootType) {
            continue;
          }

          problems.push({
            filePath: sourceFile.fileName,
            line: definition.loc?.startToken.line ?? position.line + 1,
            column: definition.loc?.startToken.column ?? position.character + 1,
            message: `Schema is not configured to execute ${definition.operation} operations.`,
          });
        }

        const validationErrors = validate(schema, document);

        for (const error of validationErrors) {
          const location = error.locations?.[0];

          problems.push({
            filePath: sourceFile.fileName,
            line: location?.line ?? position.line + 1,
            column: location?.column ?? position.character + 1,
            message: error.message,
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);

        problems.push({
          filePath: sourceFile.fileName,
          line: position.line + 1,
          column: position.character + 1,
          message,
        });
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return problems;
}

function getRootTypeForOperation(
  schema: GraphQLSchema,
  operation: OperationTypeNode,
) {
  switch (operation) {
    case "query":
      return schema.getQueryType();
    case "mutation":
      return schema.getMutationType();
    case "subscription":
      return schema.getSubscriptionType();
  }
}

async function main() {
  const schemaSource = await readFile(schemaPath, "utf8");
  const schema = buildSchema(schemaSource);
  const sourceFilePaths = await collectSourceFiles(appRoot);
  const allProblems: ValidationProblem[] = [];

  for (const filePath of sourceFilePaths) {
    const sourceText = await readFile(filePath, "utf8");
    const scriptKind = filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
    const sourceFile = ts.createSourceFile(
      filePath,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      scriptKind,
    );

    allProblems.push(...collectGraphQLProblems(sourceFile, schema));
  }

  if (allProblems.length === 0) {
    console.log(`✓ Validated GraphQL documents in ${sourceFilePaths.length} files`);
    return;
  }

  for (const problem of allProblems) {
    const relativeFilePath = path.relative(appRoot, problem.filePath);
    console.error(
      `${relativeFilePath}:${problem.line}:${problem.column} - ${problem.message}`,
    );
  }

  process.exitCode = 1;
}

await main();
