import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  platform: "browser",
  clean: true,

  // React must be provided by the consuming application.
  external: [
  /^react(?:\/.*)?$/,
  /^react-dom(?:\/.*)?$/,
  /^preact(?:\/.*)?$/,
],

  // These dependencies need to be bundled because some expose
  // source files or module paths that Node cannot load directly.
  noExternal: [
    /^primereact(?:\/.*)?$/,
    /^d3(?:$|[-/].*)/,
    /^react-tooltip(?:\/.*)?$/,
    /^tstl(?:\/.*)?$/,
  ],

  esbuildOptions(options) {
    options.loader = {
      ...options.loader,
      ".js": "jsx",
    };
    options.jsx = "automatic";
  },
});
