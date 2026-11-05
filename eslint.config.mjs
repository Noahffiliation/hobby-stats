import js from "@eslint/js";
import globals from "globals";

export default [
  js.configs.recommended,
  {
    files: ["api/**/*.js", "src/**/*.js", "public/**/*.js", "scripts/**/*.js"],
    rules: {
      complexity: ["error", 12],
      "no-nested-ternary": "error",
    },
  },
  {
    files: [
      "api/**/*.js",
      "src/**/*.js",
      "scripts/**/*.js",
      "eslint.config.mjs",
    ],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["public/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.browser,
      },
    },
  },
  {
    files: ["tests/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.browser,
      },
    },
  },
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "build/**",
      "artifacts/**",
      ".scannerwork/**",
      ".vercel/**",
    ],
  },
];
