import * as ts from "typescript";
import * as fs from "fs";
import MagicString from "magic-string";

Error.stackTraceLimit = Infinity;

const f = ts.factory;

export function visit(
  sourceFile: ts.SourceFile,
  transform: (node: ts.Node) => ts.Node | null
) {
  const source = fs.readFileSync(sourceFile.fileName, "utf-8");
  const target = new MagicString(source, {});
  const printer = ts.createPrinter();

  visitNode(sourceFile);

  function visitNode(node: ts.Node) {
    const replacedNode = transform(node);
    if (replacedNode) {
      const replacement = printer.printNode(
        ts.EmitHint.Unspecified,
        replacedNode,
        sourceFile
      );
      target.overwrite(node.getStart(), node.getEnd(), replacement);
    } else {
      ts.forEachChild(node, visitNode);
    }
  }

  fs.writeFileSync(sourceFile.fileName, target.toString());
  return sourceFile;
}

const fileNames = process.argv.slice(2);

let program = ts.createProgram(fileNames, { strict: true });

// Get the checker, we will use it to find more about classes
const checker = program.getTypeChecker();

// Visit every sourceFile in the program
for (const sourceFile of program.getSourceFiles()) {
  if (!sourceFile.isDeclarationFile) {
    // Walk the tree to search for classes
    visit(sourceFile, (node) => {
      if (
        ts.isCallExpression(node) &&
        ts.isPropertyAccessExpression(node.expression) &&
        node.expression.name.text === "deprecated_some"
      ) {
        const arrayNode = node.arguments[0];
        const type = checker.getTypeAtLocation(arrayNode);
        const isNullable =
          type.isUnion() && type.types.some((t) => t.flags & ts.TypeFlags.Null);

        const propertyAccessExpression = f.createPropertyAccessChain(
          arrayNode,
          isNullable
            ? f.createToken(ts.SyntaxKind.QuestionDotToken)
            : undefined,
          f.createIdentifier("some")
        );
        const callExpression = f.createCallExpression(
          propertyAccessExpression,
          [],
          node.arguments.slice(1)
        );
        let expression: ts.Node = callExpression;

        if (isNullable) {
          expression = f.createBinaryExpression(
            callExpression,
            f.createToken(ts.SyntaxKind.QuestionQuestionToken),
            f.createFalse()
          );
        }

        return expression;
      }
      return null;
    });
  }
}
