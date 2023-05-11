import * as jsdom from "jsdom";
import * as vm from "vm";
import * as fs from "fs";
import * as path from "path";
import * as api from "./api.js";
import * as babelParser from "@babel/parser";
import babelGenerate from "@babel/generator";

function getSourceFromNodeModule(specifier: string, basePath = "") {
  let modPath = path.join(basePath, "node_modules", specifier);

  if (fs.lstatSync(modPath).isDirectory()) {
    const packagePath = path.join(modPath, "package.json");
    if (fs.existsSync(packagePath)) {
      const packageJson = JSON.parse(
        fs.readFileSync(packagePath, "utf8")
      ) as object;
      if ("main" in packageJson)
        modPath = path.join(modPath, packageJson.main as string);
    }
  }

  return fs.readFileSync(modPath, "utf8");
}

export async function executeInTestContext(
  filePath: string,
  options: {
    html?: string;
    jsdomOptions?: jsdom.ConstructorOptions;
    basePath?: string;
    babelPlugins?: babelParser.ParserPlugin[];
  } = {}
) {
  options.babelPlugins ||= [];

  const tsExtensions = [".ts", ".mts"];
  const fileExt = path.extname(filePath);

  if (![".js", ".mjs", ...tsExtensions].includes(fileExt))
    throw new Error(
      "Test file must be a JavaScript module (`.js` or `.mjs`) or a TypeScript module (`.ts` or `.mts`)."
    );

  if (
    tsExtensions.includes(fileExt) &&
    !options.babelPlugins.includes("typescript")
  )
    options.babelPlugins.push("typescript");

  const dom = new jsdom.JSDOM(options.html, options.jsdomOptions);
  dom.window.$EASYTESTS = api;
  const context = vm.createContext(dom.window);

  const mod = new vm.SourceTextModule(
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call
    babelGenerate.default(
      babelParser.parse(fs.readFileSync(filePath, "utf8"), {
        sourceType: "module",
        plugins: options.babelPlugins,
      }),
      { retainLines: true }
    ).code,
    {
      context,
      identifier: filePath,
    }
  );

  await mod.link((specifier) => {
    let source: string;

    if (specifier.endsWith(".d.ts")) source = "";
    else if (specifier.startsWith("./"))
      source = fs.readFileSync(path.join(filePath, specifier), "utf8");
    else source = getSourceFromNodeModule(specifier, options.basePath);

    return new vm.SourceTextModule(source, {
      context,
    });
  });

  await mod.evaluate();
}
