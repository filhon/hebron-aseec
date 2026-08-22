import type { MetadataRoute } from "next";

// NEG-011 (PACOTE 11, AUDIT/04-BACKLOG-CORRECAO.md) — bloqueia a área
// editorial (staff, atrás de sessão — indexá-la não ajudaria ninguém e
// vazaria a estrutura de rotas privadas) e a busca (páginas com querystring,
// conteúdo duplicado do resto do portal).
const BASE_URL = "https://docs.hebronaseec.com.br";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/editorial", "/busca"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
