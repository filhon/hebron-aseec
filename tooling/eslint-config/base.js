// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

/** @type {import("typescript-eslint").Config} */
export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    languageOptions: {
      parserOptions: {
        project: true,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "separate-type-imports" },
      ],
      "@typescript-eslint/no-import-type-side-effects": "error",
      "@typescript-eslint/consistent-type-exports": "error",
    },
  },
  {
    ignores: ["node_modules/**", "dist/**", ".next/**", "*.config.{mjs,cjs}"],
  },
);
