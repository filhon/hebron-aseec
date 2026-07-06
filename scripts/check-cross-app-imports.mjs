#!/usr/bin/env node
// ---------------------------------------------------------------------------
// check-cross-app-imports — G6.5 / P-0.15 (CS-6, S1-09)
//
// "App NUNCA importa de outro app" — cada apps/<nome> é um deploy Next.js
// isolado; código consumido por mais de um app precisa viver em
// packages/integrations (ou outro package). Um import relativo que escapa
// de apps/<a>/ e entra em apps/<b>/ reintroduz o acoplamento que a
// auditoria (CS-6) encontrou entre Projetos e os módulos ainda não
// construídos (Tarefas, Flats).
//
// Verifica só imports relativos: apps não expõem `exports` em package.json
// (confirmado em P-0.14/SESSIONS S-66), então um import por nome de pacote
// não consegue mirar outro app — só um caminho relativo que sobe da própria
// pasta consegue.
// ---------------------------------------------------------------------------
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, extname, join, relative, resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const APPS_DIR = join(ROOT, "apps");
const SOURCE_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs"]);
const IGNORED_DIRS = new Set([
  "node_modules",
  ".next",
  ".turbo",
  "dist",
  "__tests__",
]);
const IMPORT_PATTERN =
  /(?:from|import)\s*\(?\s*["']([^"']+)["']|require\(\s*["']([^"']+)["']\s*\)/g;

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (IGNORED_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (SOURCE_EXTENSIONS.has(extname(entry.name))) {
      yield full;
    }
  }
}

function appNameOf(filePath) {
  const rel = relative(APPS_DIR, filePath);
  const [app] = rel.split(/[\\/]/);
  return app;
}

function isDir(path) {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
}

const violations = [];

for (const app of readdirSync(APPS_DIR, { withFileTypes: true })) {
  if (!app.isDirectory()) continue;
  const appSrc = join(APPS_DIR, app.name, "src");
  if (!isDir(appSrc)) continue;

  for (const file of walk(appSrc)) {
    const content = readFileSync(file, "utf8");
    let match;
    while ((match = IMPORT_PATTERN.exec(content))) {
      const specifier = match[1] ?? match[2];
      if (!specifier.startsWith(".")) continue; // package imports can't reach another app

      const resolved = resolve(dirname(file), specifier);
      const targetApp = appNameOf(resolved);
      if (targetApp && targetApp !== app.name) {
        violations.push({
          file: relative(ROOT, file),
          specifier,
          targetApp,
        });
      }
    }
  }
}

if (violations.length > 0) {
  console.error(
    "Cross-app imports found (G6.5 — app nunca importa de outro app):\n",
  );
  for (const v of violations) {
    console.error(
      `  ${v.file}\n    imports "${v.specifier}" → apps/${v.targetApp}\n`,
    );
  }
  console.error(
    `${violations.length} violation(s). Move the shared logic to packages/integrations (P-0.15) instead.`,
  );
  process.exit(1);
}

console.log("check-cross-app-imports: no app→app imports found.");
