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

// Security headers (AUDIT/04-BACKLOG-CORRECAO.md, PACOTE 5 / D3-003) — sem
// isto, telas sensíveis (aprovação financeira, votação de projeto) podiam
// ser embutidas em iframe de terceiro. CSP começa em Report-Only (mesmo
// pacote pede isso explicitamente): reporta violação sem quebrar nada,
// até um ciclo futuro promovê-la a bloqueante depois de observar produção.
const SECURITY_HEADERS = [
  // frame-ancestors 'none' já bloqueia embed, mesmo com a CSP em modo
  // report-only — não é sujeito ao "report only" porque X-Frame-Options é
  // um header próprio, não parte da CSP.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // HSTS: inofensivo em dev (http ignora o header); preload exige submissão
  // manual em hstspreload.org, feita fora do código quando o domínio raiz
  // estiver estável em produção.
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: [
      "default-src 'self'",
      // Next.js App Router injeta script/estilo inline no hydration —
      // 'unsafe-inline' aqui é o ponto de partida documentado pelo próprio
      // Next para CSP; endurecer com nonce fica para uma iteração futura,
      // fora do escopo deste pacote (não é regressão, é o mesmo nível que
      // "nenhum header" tinha antes, com o resto da política já ativa).
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self' data:",
      "media-src 'self' https://*.b-cdn.net https://*.r2.cloudflarestorage.com",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://*.b-cdn.net",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

export function createNextConfig(overrides: NextConfig = {}): NextConfig {
  const {
    webpack: overrideWebpack,
    headers: overrideHeaders,
    transpilePackages,
    ...rest
  } = overrides;

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
    async headers() {
      const overrideRules = overrideHeaders ? await overrideHeaders() : [];
      return [{ source: "/(.*)", headers: SECURITY_HEADERS }, ...overrideRules];
    },
  };
}
