import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import * as ts from "typescript"
import { describe, expect, it } from "vitest"

const CLIENTS = [
  { file: "src/realtime/agent-client.ts", className: "AgentClient" },
  { file: "src/realtime/stt-client.ts", className: "SttClient" },
] as const

const PRODUCT_ROOT = "src/features"

function sourceFiles(directory: string): readonly string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      return sourceFiles(path)
    }
    return /\.tsx?$/.test(entry.name) ? [path] : []
  })
}

function isPublic(member: ts.ClassElement): boolean {
  const modifiers = ts.canHaveModifiers(member) ? (ts.getModifiers(member) ?? []) : []
  return !modifiers.some(
    (modifier) =>
      modifier.kind === ts.SyntaxKind.PrivateKeyword ||
      modifier.kind === ts.SyntaxKind.ProtectedKeyword ||
      modifier.kind === ts.SyntaxKind.StaticKeyword,
  )
}

function publicMembersOf(text: string, className: string): readonly string[] {
  const source = ts.createSourceFile("scanned.ts", text, ts.ScriptTarget.Latest)
  const declaration = source.statements.find(
    (statement): statement is ts.ClassDeclaration =>
      ts.isClassDeclaration(statement) && statement.name?.text === className,
  )
  if (declaration === undefined) {
    return []
  }
  return declaration.members
    .filter(
      (member) =>
        ts.isMethodDeclaration(member) ||
        ts.isGetAccessorDeclaration(member) ||
        ts.isSetAccessorDeclaration(member) ||
        ts.isPropertyDeclaration(member),
    )
    .filter(isPublic)
    .map((member) =>
      member.name !== undefined && ts.isIdentifier(member.name) ? member.name.text : "",
    )
    .filter((name) => name.length > 0 && !name.startsWith("#"))
}

function publicMembers(file: string, className: string): readonly string[] {
  return publicMembersOf(readFileSync(file, "utf8"), className)
}

const productText = sourceFiles(PRODUCT_ROOT)
  .map((file) => readFileSync(file, "utf8"))
  .join("\n")

function calledInProduct(member: string): boolean {
  return new RegExp(`[?]?\\.${member}\\b`).test(productText)
}

describe("every public member of a socket client has a caller in the product", () => {
  for (const { file, className } of CLIENTS) {
    it(`finds ${className} and at least one public member, so an empty scan cannot pass`, () => {
      expect(publicMembers(file, className).length).toBeGreaterThan(0)
    })

    it(`${className}: each public member is reached from ${PRODUCT_ROOT}`, () => {
      const stranded = publicMembers(file, className).filter(
        (member) => !calledInProduct(member),
      )
      expect(
        stranded,
        "a capability that exists, is public, and never runs is the defect class that left the agent silent; delete the member or wire it into the product path",
      ).toEqual([])
    })
  }

  it("catches a planted public member nothing calls, and ignores private ones", () => {
    const planted = [
      "export class Planted {",
      "  private hidden(): void {}",
      "  get isOpen(): boolean { return true }",
      "  plantedCapabilityNobodyCalls(): void {}",
      "}",
    ].join("\n")
    const members = publicMembersOf(planted, "Planted")
    expect(members).toEqual(["isOpen", "plantedCapabilityNobodyCalls"])
    expect(members.filter((member) => !calledInProduct(member))).toEqual([
      "plantedCapabilityNobodyCalls",
    ])
  })
})
