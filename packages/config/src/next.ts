import type { NextConfig } from "next";

// Todos os packages workspace consumidos via `transpilePackages` — nenhum
// app deve declarar essa lista localmente (P-0.1b).
const TRANSPILE_PACKAGES = [
  "@hebron/ui",
  "@hebron/auth",
  "@hebron/db",
  "@hebron/types",
  "@hebron/validators",
  "@hebron/config",
  "@hebron/email",
  "@hebron/integrations",
  "@hebron/ai",
  "@hebron/jobs",
];

export function createNextConfig(overrides: NextConfig = {}): NextConfig {
  const { webpack: overrideWebpack, transpilePackages, ...rest } = overrides;

  return {
    transpilePackages: transpilePackages ?? TRANSPILE_PACKAGES,
    ...rest,
    // Hash WASM do webpack (Next 15.5.18) quebra em Node 24 dentro de
    // WasmHash._updateWithBuffer; sha256 (Node crypto) contorna o bug do
    // hash WASM e é estável em Node 20 e 24 (achado P-0.1b, item 1).
    // Fica por último para não ser descartado por um webpack de override.
    webpack: (config, context) => {
      config.output = { ...config.output, hashFunction: "sha256" };
      return overrideWebpack ? overrideWebpack(config, context) : config;
    },
  };
}
