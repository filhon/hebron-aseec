// @ts-check
import fs from "node:fs";
import path from "node:path";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";

// P-0.5d: a regra no-html-link-for-pages só faz sentido nos 9 apps Next.js
// (App Router). Detecta pela presença de next.config.* no cwd do consumidor
// — evita o aviso "Pages directory cannot be found" do plugin em todo
// package sem Next.js (packages/ui é deliberadamente agnóstico de
// framework, sem `next` nas dependências).
const isNextApp = ["next.config.js", "next.config.mjs", "next.config.ts"].some(
  (file) => fs.existsSync(path.join(process.cwd(), file)),
);

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
  ...(isNextApp
    ? [
        {
          // P-0.5d: guarda contra a regressão do LinkComponent nunca ligado
          // (S-48) — todo <a href="/rota-interna"> deve ser next/link.
          plugins: {
            "@next/next": nextPlugin,
          },
          settings: {
            next: {
              rootDir: process.cwd(),
            },
          },
          rules: {
            "@next/next/no-html-link-for-pages": "error",
          },
        },
      ]
    : []),
  {
    ignores: ["node_modules/**", "dist/**", ".next/**", "*.config.{mjs,cjs}"],
  },
);
