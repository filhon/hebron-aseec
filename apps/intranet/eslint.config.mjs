import baseConfig from "@hebron/eslint-config/base";

/** @type {import("typescript-eslint").Config} */
export default [
  ...baseConfig,
  // next-env.d.ts é gerado automaticamente pelo Next.js — não deve ser lintado
  { ignores: ["next-env.d.ts"] },
];
