import { existsSync, readFileSync } from "node:fs";
import { extname } from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = new URL("../", import.meta.url);

export async function resolve(specifier, context, nextResolve) {
  const alias = specifier.startsWith("@/");
  const url = alias ? new URL(specifier.slice(2), root)
    : specifier.startsWith(".") && context.parentURL ? new URL(specifier, context.parentURL) : null;

  if (url?.protocol === "file:" && !extname(url.pathname)) {
    for (const extension of [".ts", ".tsx"]) {
      const candidate = new URL(`${url.href}${extension}`);
      if (existsSync(candidate)) return nextResolve(candidate.href, context);
    }
  }
  return nextResolve(alias ? url.href : specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith(root.href) && /\.tsx?$/.test(new URL(url).pathname)) {
    const { outputText } = ts.transpileModule(readFileSync(new URL(url), "utf8"), {
      fileName: fileURLToPath(url),
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    return { format: "module", source: outputText, shortCircuit: true };
  }
  return nextLoad(url, context);
}
