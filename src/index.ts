import * as jsdom from "jsdom";
import * as vm from "vm";
import * as fs from "fs";
import * as path from "path";
import * as api from "./api.js";
import babel from "@babel/core";

function getMainPathFromNodeModule(specifier: string, basePath = "") {
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

  return modPath;
}

function compileWithBabel(filePath: string) {
  const res = babel.transformFileSync(filePath, {
    presets: ["@babel/preset-typescript"],
  });

  if (!res?.code) throw new Error(`Couldn't compile \`${filePath}\``);

  return res.code;
}

export async function executeInTestContext(
  filePath: string,
  options: {
    html?: string;
    jsdomOptions?: jsdom.ConstructorOptions;
    basePath?: string;
  } = {}
) {
  if (![".js", ".mjs", ".ts", ".mts"].includes(path.extname(filePath)))
    throw new Error(
      "Test file must be a JavaScript module (`.js` or `.mjs`) or a TypeScript module (`.ts` or `.mts`)."
    );

  const dom = new jsdom.JSDOM(options.html, options.jsdomOptions);
  dom.window.$EASYTESTS = api;
  const context = vm.createContext(dom.window);

  const mod = new vm.SourceTextModule(compileWithBabel(filePath), {
    context,
    identifier: filePath,
  });

  await mod.link((specifier) => {
    let source: string;

    if (specifier.endsWith(".d.ts")) source = "";
    else if (specifier.startsWith("./"))
      source = compileWithBabel(path.join(filePath, specifier));
    else
      source = compileWithBabel(
        getMainPathFromNodeModule(specifier, options.basePath)
      );

    return new vm.SourceTextModule(source, {
      context,
      identifier: specifier,
    });
  });

  await mod.evaluate();
}
