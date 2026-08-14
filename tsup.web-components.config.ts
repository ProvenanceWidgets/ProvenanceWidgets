import { defineConfig } from "tsup";
import { constants } from "node:fs";
import { access, copyFile, rename, rm } from "node:fs/promises";

const outputDirectory = new URL("./dist/web-components/", import.meta.url);

const publishGeneratedFile = async (
  generatedFile: URL,
  publicFile: URL
) => {
  try {
    await rename(generatedFile, publicFile);
  } catch (error) {
    if (
      !error ||
      typeof error !== "object" ||
      !("code" in error) ||
      error.code !== "EPERM"
    ) {
      throw error;
    }
    await copyFile(generatedFile, publicFile);
    await rm(generatedFile, { force: true });
  }
};

const prepareOutput = async () => {
  const generatedScript = new URL("index.global.js", outputDirectory);
  await access(generatedScript, constants.R_OK);
  await copyFile(
    new URL("./src/web-components/public.d.ts", import.meta.url),
    new URL("index.d.ts", outputDirectory)
  );
  await publishGeneratedFile(
    generatedScript,
    new URL("index.js", outputDirectory)
  );
  await publishGeneratedFile(
    new URL("index.css", outputDirectory),
    new URL("styles.css", outputDirectory)
  );
};

export default defineConfig({
  entry: {
    index: "src/web-components/index.tsx",
  },
  format: ["iife"],
  globalName: "ProvenanceWidgetsWebComponents",
  platform: "browser",
  target: "es2020",
  outDir: "dist/web-components",
  clean: true,
  splitting: false,
  sourcemap: true,
  minify: false,
  noExternal: [/.*/],
  onSuccess: prepareOutput,
  esbuildOptions(options) {
    options.alias = {
      ...options.alias,
      react: "preact/compat",
      "react-dom": "preact/compat",
      "react-dom/client": "preact/compat/client",
      "react/jsx-runtime": "preact/jsx-runtime",
      "react/jsx-dev-runtime": "preact/jsx-runtime",
    };
    options.loader = {
      ...options.loader,
      ".js": "jsx",
    };
    options.jsx = "automatic";
    options.jsxImportSource = "preact";
  },
});
