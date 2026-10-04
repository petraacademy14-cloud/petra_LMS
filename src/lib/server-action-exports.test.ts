import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import ts from "typescript";

describe("academic setup server-action exports", () => {
  for (const name of ["foundation", "class-management"]) {
    it(`${name} exports only async functions at runtime`, () => {
      const source = readFileSync(new URL(`../app/actions/${name}.ts`, import.meta.url), "utf8");
      const file = ts.createSourceFile(`${name}.ts`, source, ts.ScriptTarget.Latest, true);
      const invalid = file.statements.filter((statement) => {
        if (!ts.canHaveModifiers(statement)) return false;
        const modifiers = ts.getModifiers(statement) ?? [];
        if (!modifiers.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)) return false;
        if (ts.isTypeAliasDeclaration(statement) || ts.isInterfaceDeclaration(statement)) return false;
        return !ts.isFunctionDeclaration(statement) || !modifiers.some((m) => m.kind === ts.SyntaxKind.AsyncKeyword);
      });
      expect(invalid.map((statement) => statement.getText(file))).toEqual([]);
    });
  }
});
