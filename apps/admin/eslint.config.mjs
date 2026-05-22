import baseConfig from "@hebron/eslint-config/base";

/** @type {import("typescript-eslint").Config} */
export default [...baseConfig, { ignores: ["next-env.d.ts", ".next/**"] }];
