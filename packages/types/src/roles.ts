export const ROLES = [
  "super_admin",
  "diretor",
  "conselheiro",
  "colaborador",
  "submissor",
  "aluno",
  "hospede",
  "ouvinte",
] as const satisfies readonly [string, ...string[]];

export type Role = (typeof ROLES)[number];

export const DESIGNATION_TYPES = [
  "gestor",
  "autorizador",
] as const satisfies readonly [string, ...string[]];

export type DesignationType = (typeof DESIGNATION_TYPES)[number];

export const SCOPES = [
  "global",
  "admin",
  "projetos",
  "plataforma",
  "radio",
  "financeiro",
  "intranet",
  "documentos",
  "flats",
  "tarefas",
] as const;

export type Scope = (typeof SCOPES)[number];
