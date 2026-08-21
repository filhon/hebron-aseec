import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import Link from "next/link";
import { db } from "@hebron/db/client";
import { and, eq, asc, isNull } from "drizzle-orm";
import { users, designations, roleAssignments } from "@hebron/db/schema";
import {
  featureFlags,
  systemSettings,
  emailTemplates,
  taskTemplates,
} from "@hebron/db/schema";
import {
  PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY,
  PROJETOS_DUPLICATE_THRESHOLD_SETTING_KEY,
} from "@hebron/db/seed";
import { resolveSession } from "@hebron/auth/server";
import {
  Shield,
  Flag,
  Mail,
  Settings2,
  AlertCircle,
  UserCheck,
  UserCog,
  Eye,
  Check,
  Users,
} from "lucide-react";
import {
  toggleFeatureFlag,
  setProjetosChecklistTemplate,
  updateSystemSetting,
} from "../../../actions/settings";
import { RoleAssignmentPanel } from "../../../components/role-assignment-panel";
import { DesignationPanel } from "../../../components/designation-panel";
import { EmailTemplateEditor } from "../../../components/email-template-editor";
import { EmailTemplatePreview } from "../../../components/email-template-preview";
import { logAudit } from "../../../lib/audit";
import type {
  RoleAssignmentInput,
  EmailTemplateInput,
} from "@hebron/validators";
import type { EmailTemplate } from "@hebron/types/admin";

// ─── DB ───────────────────────────────────────────────────────────────────────

// ─── Types ────────────────────────────────────────────────────────────────────

type TabId =
  | "designacoes"
  | "roles"
  | "feature-flags"
  | "email-templates"
  | "sistema";

const TABS: { id: TabId; label: string; icon: React.ReactNode }[] = [
  { id: "designacoes", label: "Designações", icon: <Shield size={14} /> },
  { id: "roles", label: "Papéis", icon: <Users size={14} /> },
  { id: "feature-flags", label: "Feature flags", icon: <Flag size={14} /> },
  {
    id: "email-templates",
    label: "Templates de email",
    icon: <Mail size={14} />,
  },
  { id: "sistema", label: "Sistema", icon: <Settings2 size={14} /> },
];

// ─── Email template metadata (movido de templates-email/page.tsx, P-1.10b) ────

type TemplateGroup = "Geral" | "Projetos" | "Financeiro" | "Intranet";

type EmailTemplateSlug =
  | "invitation"
  | "welcome"
  | "password-reset"
  | "projetos-submitted"
  | "projetos-in-validation"
  | "projetos-voting-open"
  | "projetos-approved"
  | "projetos-rejected"
  | "projetos-blocked"
  | "projetos-contested"
  | "projetos-evaluator-designated"
  | "projetos-payment-made"
  | "report-reminder-7d-before"
  | "report-reminder-due-today"
  | "report-reminder-expiry"
  | "financeiro-batch-approval"
  | "financeiro-budget-alert"
  | "financeiro-monthly-report"
  | "intranet-urgent-announcement"
  | "intranet-briefing";

interface EmailTemplateMeta {
  slug: EmailTemplateSlug;
  label: string;
  description: string;
  variables: string[];
  group: TemplateGroup;
}

const TEMPLATE_META: EmailTemplateMeta[] = [
  {
    slug: "invitation",
    label: "Convite de acesso",
    description: "Enviado ao convidar um novo usuário para a plataforma",
    variables: ["nome", "link", "papel"],
    group: "Geral",
  },
  {
    slug: "welcome",
    label: "Boas-vindas",
    description: "Enviado quando o convite é aceito e a conta é ativada",
    variables: ["nome", "link", "papel"],
    group: "Geral",
  },
  {
    slug: "password-reset",
    label: "Reset de senha",
    description: "Enviado ao solicitar redefinição de senha",
    variables: ["nome", "link"],
    group: "Geral",
  },
  {
    slug: "projetos-submitted",
    label: "Nova submissão",
    description: "Enviado a super_admins quando um projeto é submetido",
    variables: ["nome", "titulo", "submissor", "tipo", "organizacao", "link"],
    group: "Projetos",
  },
  {
    slug: "projetos-in-validation",
    label: "Projeto em análise",
    description: "Enviado ao submissor quando o projeto entra em validação",
    variables: ["nome", "titulo", "link"],
    group: "Projetos",
  },
  {
    slug: "projetos-voting-open",
    label: "Votação aberta",
    description: "Enviado a diretores e conselheiros quando a votação abre",
    variables: ["nome", "titulo", "link"],
    group: "Projetos",
  },
  {
    slug: "projetos-approved",
    label: "Projeto aprovado",
    description: "Enviado ao submissor após homologação com aprovação",
    variables: ["nome", "titulo", "link"],
    group: "Projetos",
  },
  {
    slug: "projetos-rejected",
    label: "Projeto não aprovado",
    description: "Enviado ao submissor após homologação com reprovação",
    variables: ["nome", "titulo", "link"],
    group: "Projetos",
  },
  {
    slug: "projetos-blocked",
    label: "Projeto bloqueado",
    description: "Enviado ao submissor e super_admins por falta de relatório",
    variables: ["nome", "titulo", "link"],
    group: "Projetos",
  },
  {
    slug: "projetos-contested",
    label: "Contestação",
    description: "Enviado a diretores e conselheiros quando há contestação",
    variables: ["nome", "titulo", "contestador", "link"],
    group: "Projetos",
  },
  {
    slug: "projetos-evaluator-designated",
    label: "Projetos designados",
    description: "Enviado ao avaliador 7 dias antes da reunião de votação",
    variables: ["nome", "titulo", "reuniao", "link"],
    group: "Projetos",
  },
  {
    slug: "projetos-payment-made",
    label: "Pagamento realizado",
    description: "Enviado ao submissor quando um pagamento é processado",
    variables: ["nome", "titulo", "valor", "data", "link"],
    group: "Projetos",
  },
  {
    slug: "report-reminder-7d-before",
    label: "Relatório: 7 dias",
    description: "Lembrete de relatório 7 dias antes do prazo",
    variables: ["nome", "titulo", "prazo", "link"],
    group: "Projetos",
  },
  {
    slug: "report-reminder-due-today",
    label: "Relatório: hoje",
    description: "Lembrete de relatório no dia do prazo",
    variables: ["nome", "titulo", "link"],
    group: "Projetos",
  },
  {
    slug: "report-reminder-expiry",
    label: "Relatório em atraso",
    description: "Lembrete de relatório 7 dias antes do prazo de expiração",
    variables: ["nome", "titulo", "prazo", "link"],
    group: "Projetos",
  },
  {
    slug: "financeiro-batch-approval",
    label: "Lote semanal aguarda aprovação",
    description:
      "Enviado ao diretor gestor (cópia ao autorizador) quando o lote semanal de pagamentos é criado",
    variables: [
      "nome",
      "semanaInicio",
      "semanaFim",
      "quantidade",
      "valorTotal",
      "link",
    ],
    group: "Financeiro",
  },
  {
    slug: "financeiro-budget-alert",
    label: "Orçamento acima de 80%",
    description:
      "Enviado a super_admins quando a execução do orçamento de um centro de custo ultrapassa 80%",
    variables: [
      "nome",
      "centroCusto",
      "ano",
      "valorOrcado",
      "valorExecutado",
      "percentual",
      "link",
    ],
    group: "Financeiro",
  },
  {
    slug: "financeiro-monthly-report",
    label: "Relatório financeiro mensal",
    description:
      "Enviado a diretores e conselheiros com o relatório consolidado do mês anterior (PDF e XLSX em anexo)",
    variables: [
      "nome",
      "mes",
      "ano",
      "receitas",
      "despesas",
      "resultado",
      "link",
    ],
    group: "Financeiro",
  },
  {
    slug: "intranet-urgent-announcement",
    label: "Anúncio urgente",
    description:
      "Enviado a todos os papéis internos quando um anúncio urgente é publicado",
    variables: ["nome", "titulo", "corpo", "autor", "dataPublicacao", "link"],
    group: "Intranet",
  },
  {
    slug: "intranet-briefing",
    label: "Briefing diário/semanal",
    description:
      "Enviado por opt-in (Configurações → Briefing) com o resumo de KPIs e últimos eventos",
    variables: ["nome", "cadencia", "periodo", "kpis", "eventos", "link"],
    group: "Intranet",
  },
];

const VALID_EMAIL_TEMPLATE_SLUGS = TEMPLATE_META.map((m) => m.slug);

function validateEmailTemplateSlug(raw: string | undefined): EmailTemplateSlug {
  if (raw && (VALID_EMAIL_TEMPLATE_SLUGS as string[]).includes(raw))
    return raw as EmailTemplateSlug;
  return "invitation";
}

const DEFAULT_EMAIL_TEMPLATES: Record<
  EmailTemplateSlug,
  { subject: string; bodyHtml: string; bodyText: string }
> = {
  invitation: {
    subject: "Convite para Hebron Aseec",
    bodyHtml: `<p>Olá,</p>
<p>{{nome}} convidou você para acessar a plataforma <strong>Hebron Aseec</strong>.</p>
<p><strong>Papel(éis) atribuído(s):</strong> {{papel}}</p>
<p style="margin-top:24px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Aceitar convite</a>
</p>
<p style="margin-top:20px;font-size:13px;color:#6B7280;">
  Este convite tem validade limitada. Se você não esperava este convite, ignore este e-mail.
</p>`,
    bodyText: `Olá,\n\n{{nome}} convidou você para acessar a plataforma Hebron Aseec.\n\nPapel(éis): {{papel}}\n\nAceite o convite em: {{link}}\n\nSe você não esperava este convite, ignore este e-mail.`,
  },
  welcome: {
    subject: "Bem-vindo(a) à Hebron Aseec",
    bodyHtml: `<p>Bem-vindo(a), <strong>{{nome}}</strong>.</p>
<p>Sua conta na plataforma <strong>Hebron Aseec</strong> foi ativada com sucesso.</p>
<p><strong>Acesso concedido:</strong> {{papel}}</p>
<p style="margin-top:24px;">
  <a href="{{link}}" style="background:#EA5A06;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Acessar plataforma</a>
</p>`,
    bodyText: `Bem-vindo(a), {{nome}}.\n\nSua conta foi ativada na plataforma Hebron Aseec.\n\nAcesso concedido: {{papel}}\n\nAcesse em: {{link}}`,
  },
  "password-reset": {
    subject: "Redefinição de senha — Hebron Aseec",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Recebemos uma solicitação para redefinir a senha da sua conta na plataforma <strong>Hebron Aseec</strong>.</p>
<p style="margin-top:24px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Redefinir senha</a>
</p>
<p style="margin-top:20px;font-size:13px;color:#6B7280;">
  Se você não fez esta solicitação, ignore este e-mail. Sua senha permanece inalterada.
</p>`,
    bodyText: `Olá, {{nome}},\n\nRecebemos uma solicitação para redefinir sua senha na plataforma Hebron Aseec.\n\nAcesse o link para redefinir: {{link}}\n\nSe você não fez esta solicitação, ignore este e-mail.`,
  },
  "projetos-submitted": {
    subject: "Nova submissão de projeto: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Um novo projeto foi submetido e aguarda validação.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F9FAFB;border-radius:8px;padding:16px;">
  <tr><td style="font-size:12px;color:#6B7280;width:140px;padding-bottom:6px;">Projeto</td><td style="font-size:13px;font-weight:700;padding-bottom:6px;">{{titulo}}</td></tr>
  <tr><td style="font-size:12px;color:#6B7280;padding-bottom:6px;">Submissor</td><td style="font-size:13px;padding-bottom:6px;">{{submissor}}</td></tr>
  <tr><td style="font-size:12px;color:#6B7280;padding-bottom:6px;">Tipo</td><td style="font-size:13px;padding-bottom:6px;">{{tipo}}</td></tr>
  <tr><td style="font-size:12px;color:#6B7280;">Organização</td><td style="font-size:13px;">{{organizacao}}</td></tr>
</table>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Revisar projeto</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nNova submissão: {{titulo}}\nSubmissor: {{submissor}}\nTipo: {{tipo}}\nOrganização: {{organizacao}}\n\nAcesse: {{link}}`,
  },
  "projetos-in-validation": {
    subject: "Projeto em análise: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Seu projeto <strong>{{titulo}}</strong> foi recebido e está sendo analisado pela equipe de administração da Hebron Aseec.</p>
<p>Você será notificado sobre o resultado da análise.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver projeto</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nSeu projeto "{{titulo}}" está sendo analisado pela administração.\n\nAcesse: {{link}}`,
  },
  "projetos-voting-open": {
    subject: "Votação aberta: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>O projeto <strong>{{titulo}}</strong> está na fase de votação e aguarda sua participação.</p>
<p>Acesse o portal para registrar sua avaliação antes da reunião.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Avaliar projeto</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO projeto "{{titulo}}" aguarda sua avaliação.\n\nAcesse: {{link}}`,
  },
  "projetos-approved": {
    subject: "Projeto aprovado: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Temos uma boa notícia: o projeto <strong>{{titulo}}</strong> foi aprovado pela diretoria da Hebron Aseec após o período de homologação.</p>
<p>Os pagamentos serão processados conforme o cronograma aprovado.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#16A34A;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver detalhes</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nSeu projeto "{{titulo}}" foi aprovado pela diretoria da Hebron Aseec.\n\nAcesse: {{link}}`,
  },
  "projetos-rejected": {
    subject: "Atualização sobre seu projeto: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Após análise pela diretoria, o projeto <strong>{{titulo}}</strong> não foi aprovado neste ciclo.</p>
<p>Entre em contato com a administração para mais informações ou para submeter um novo projeto.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver detalhes</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO projeto "{{titulo}}" não foi aprovado neste ciclo.\n\nAcesse: {{link}}`,
  },
  "projetos-blocked": {
    subject: "Projeto bloqueado: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>O projeto <strong>{{titulo}}</strong> foi bloqueado por falta de relatório. Os pagamentos estão suspensos até a entrega do relatório pendente.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#DC2626;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Enviar relatório</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO projeto "{{titulo}}" foi bloqueado por falta de relatório.\n\nAcesse: {{link}}`,
  },
  "projetos-contested": {
    subject: "Contestação de projeto: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Uma contestação foi registrada para o projeto <strong>{{titulo}}</strong> por <strong>{{contestador}}</strong>.</p>
<p>O projeto retorna para votação. Acesse o portal para participar.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#EA5A06;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver contestação</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\n{{contestador}} registrou uma contestação no projeto "{{titulo}}".\n\nAcesse: {{link}}`,
  },
  "projetos-evaluator-designated": {
    subject: "Projetos designados para avaliação: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Você foi designado para avaliar o projeto <strong>{{titulo}}</strong>.</p>
<p>A reunião de votação está agendada para <strong>{{reuniao}}</strong>. Acesse o portal para revisar os projetos com antecedência.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver projetos designados</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nVocê foi designado para avaliar "{{titulo}}".\nReunião: {{reuniao}}\n\nAcesse: {{link}}`,
  },
  "projetos-payment-made": {
    subject: "Pagamento realizado: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Um pagamento referente ao projeto <strong>{{titulo}}</strong> foi processado.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F9FAFB;border-radius:8px;padding:16px;">
  <tr><td style="font-size:12px;color:#6B7280;width:100px;padding-bottom:6px;">Valor</td><td style="font-size:20px;font-weight:700;color:#16A34A;padding-bottom:6px;">{{valor}}</td></tr>
  <tr><td style="font-size:12px;color:#6B7280;">Data</td><td style="font-size:13px;">{{data}}</td></tr>
</table>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver extrato do projeto</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nPagamento processado para o projeto "{{titulo}}".\nValor: {{valor}}\nData: {{data}}\n\nAcesse: {{link}}`,
  },
  "report-reminder-7d-before": {
    subject: "Relatório vence em 7 dias: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>O relatório do projeto <strong>{{titulo}}</strong> deve ser entregue até <strong>{{prazo}}</strong>. Você ainda tem 7 dias.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Enviar relatório</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO relatório do projeto "{{titulo}}" vence em {{prazo}}.\n\nAcesse: {{link}}`,
  },
  "report-reminder-due-today": {
    subject: "Relatório vence hoje: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>O prazo para entrega do relatório do projeto <strong>{{titulo}}</strong> é <strong>hoje</strong>.</p>
<p>Envie seu relatório agora para evitar o bloqueio de pagamentos.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#EA5A06;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Enviar relatório</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO relatório do projeto "{{titulo}}" vence HOJE.\n\nAcesse: {{link}}`,
  },
  "report-reminder-expiry": {
    subject: "Relatório em atraso: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>O relatório do projeto <strong>{{titulo}}</strong> está em atraso. O prazo final de expiração é <strong>{{prazo}}</strong>.</p>
<p>Após esta data, os pagamentos poderão ser bloqueados permanentemente.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#DC2626;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Enviar relatório urgente</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO relatório do projeto "{{titulo}}" está em atraso. Prazo de expiração: {{prazo}}.\n\nAcesse: {{link}}`,
  },
  "financeiro-batch-approval": {
    subject: "Lote de pagamentos aguarda aprovação — {{semanaInicio}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Um lote de pagamentos foi criado para a semana de <strong>{{semanaInicio}}</strong> a <strong>{{semanaFim}}</strong> e aguarda sua aprovação.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F9FAFB;border-radius:8px;padding:16px;">
  <tr><td style="font-size:12px;color:#6B7280;width:150px;padding-bottom:6px;">Contas a pagar</td><td style="font-size:13px;font-weight:700;padding-bottom:6px;">{{quantidade}}</td></tr>
  <tr><td style="font-size:12px;color:#6B7280;">Valor total</td><td style="font-size:13px;font-weight:700;color:#202C85;">{{valorTotal}}</td></tr>
</table>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Acessar módulo financeiro</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nUm lote de pagamentos foi criado para a semana de {{semanaInicio}} a {{semanaFim}}.\nContas a pagar: {{quantidade}}\nValor total: {{valorTotal}}\n\nAcesse: {{link}}`,
  },
  "financeiro-budget-alert": {
    subject: "Orçamento de {{centroCusto}} acima de 80% executado",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>O orçamento de <strong>{{centroCusto}}</strong> para {{ano}} atingiu <strong>{{percentual}}%</strong> de execução.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F9FAFB;border-radius:8px;padding:16px;">
  <tr><td style="font-size:12px;color:#6B7280;width:150px;padding-bottom:6px;">Orçado ({{ano}})</td><td style="font-size:13px;font-weight:700;padding-bottom:6px;">{{valorOrcado}}</td></tr>
  <tr><td style="font-size:12px;color:#6B7280;">Executado</td><td style="font-size:13px;font-weight:700;color:#EA5A06;">{{valorExecutado}} ({{percentual}}%)</td></tr>
</table>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#EA5A06;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver orçamento</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO orçamento de {{centroCusto}} para {{ano}} atingiu {{percentual}}% de execução.\nOrçado: {{valorOrcado}}\nExecutado: {{valorExecutado}}\n\nAcesse: {{link}}`,
  },
  "financeiro-monthly-report": {
    subject: "Relatório financeiro de {{mes}}/{{ano}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Segue o relatório financeiro consolidado de <strong>{{mes}} de {{ano}}</strong>. O detalhamento completo está anexado em PDF e XLSX.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F9FAFB;border-radius:8px;padding:16px;">
  <tr><td style="font-size:12px;color:#6B7280;width:150px;padding-bottom:6px;">Receitas</td><td style="font-size:13px;font-weight:700;color:#16A34A;padding-bottom:6px;">{{receitas}}</td></tr>
  <tr><td style="font-size:12px;color:#6B7280;padding-bottom:6px;">Despesas</td><td style="font-size:13px;font-weight:700;color:#EA5A06;padding-bottom:6px;">{{despesas}}</td></tr>
  <tr><td style="font-size:12px;color:#6B7280;">Resultado</td><td style="font-size:13px;font-weight:700;">{{resultado}}</td></tr>
</table>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver demonstrativos completos</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nRelatório financeiro de {{mes}}/{{ano}}.\nReceitas: {{receitas}}\nDespesas: {{despesas}}\nResultado: {{resultado}}\n\nAcesse: {{link}}`,
  },
  "intranet-urgent-announcement": {
    subject: "[Urgente] {{titulo}}",
    bodyHtml: `<p>Olá, {{nome}}.</p>
<div style="background:#F9FAFB;border-left:3px solid #EA5A06;border-radius:8px;padding:18px 22px;margin-bottom:20px;">
  <p style="margin:0;white-space:pre-wrap;">{{corpo}}</p>
</div>
<p style="font-size:13px;color:#6B7280;">Publicado por {{autor}} em {{dataPublicacao}}.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver anúncio na intranet</a>
</p>
<p style="margin-top:20px;font-size:13px;color:#6B7280;">
  Este é um anúncio urgente enviado a toda a equipe interna. Por ser comunicação operacional, este email não está sujeito a preferências de notificação.
</p>`,
    bodyText: `Olá, {{nome}}.\n\n{{titulo}}\n\n{{corpo}}\n\nPublicado por {{autor}} em {{dataPublicacao}}.\n\nAcesse: {{link}}\n\nEste é um anúncio urgente enviado a toda a equipe interna. Por ser comunicação operacional, este email não está sujeito a preferências de notificação.`,
  },
  "intranet-briefing": {
    subject: "Seu briefing {{cadencia}} — {{periodo}}",
    bodyHtml: `<p>Olá, {{nome}}. Aqui está o resumo de <strong>{{periodo}}</strong> para projetos, tarefas e financeiro.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F9FAFB;border-radius:8px;padding:16px;">
{{kpis}}
</table>
{{eventos}}
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver painel da intranet</a>
</p>
<p style="margin-top:20px;font-size:13px;color:#6B7280;">
  Este é o seu briefing {{cadencia}} automático, enviado porque você optou por recebê-lo em Configurações → Briefing. Para alterar a frequência ou desativar, acesse a intranet.
</p>`,
    bodyText: `Olá, {{nome}}. Resumo de {{periodo}} para projetos, tarefas e financeiro.\n\nAcesse: {{link}}\n\nEste é o seu briefing {{cadencia}} automático, enviado porque você optou por recebê-lo em Configurações → Briefing.`,
  },
};

// ─── Server Actions ───────────────────────────────────────────────────────────

async function handleToggleFlag(formData: FormData) {
  "use server";
  const key = formData.get("key") as string;
  const currentEnabled = formData.get("enabled") === "true";
  await toggleFeatureFlag({ key, enabled: !currentEnabled });
  revalidatePath("/configuracoes");
  redirect("/configuracoes?tab=feature-flags");
}

async function handleSetChecklistTemplate(formData: FormData) {
  "use server";
  const templateId = formData.get("templateId") as string;
  await setProjetosChecklistTemplate({ templateId });
  revalidatePath("/configuracoes");
  redirect("/configuracoes?tab=sistema");
}

async function handleSetDuplicateThreshold(formData: FormData) {
  "use server";
  const raw = formData.get("threshold") as string;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    throw new Error("Limiar deve ser um número entre 0 e 1");
  }
  await updateSystemSetting({
    key: PROJETOS_DUPLICATE_THRESHOLD_SETTING_KEY,
    value,
  });
  revalidatePath("/configuracoes");
  redirect("/configuracoes?tab=sistema");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getInitials(name: string | null): string {
  if (!name) return "?";
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0] ?? "")
    .join("")
    .toUpperCase();
}

// ─── Sub-panels (RSC) ─────────────────────────────────────────────────────────

function DesignacoesPanel({
  activeDesignations,
  revokedCount,
  directors,
}: {
  activeDesignations: Array<{
    id: string;
    type: "gestor" | "autorizador";
    userId: string;
    assignedBy: string | null;
    assignedAt: Date;
    userName: string | null;
  }>;
  revokedCount: number;
  directors: { id: string; name: string }[];
}) {
  return (
    <div>
      <div className="hb-governance-callout">
        <AlertCircle
          size={18}
          aria-hidden="true"
          style={{ flexShrink: 0, marginTop: 1 }}
        />
        <div>
          <b>Governança dual.</b> Toda despesa exige aprovação por{" "}
          <b>Diretor Gestor</b> e autorização por <b>Diretor Autorizador</b> —
          duas pessoas distintas, em duas etapas. Não use o mesmo nome para os
          dois papéis.
        </div>
      </div>

      {activeDesignations.length === 0 ? (
        <div className="hb-card">
          <div className="hb-empty">
            <b>Nenhuma designação ativa</b>
            <div className="hb-empty-body">
              Atribua um Diretor Gestor e um Diretor Autorizador para habilitar
              a governança dual.
            </div>
          </div>
        </div>
      ) : (
        <div className="hb-grid hb-grid-2 hb-designation-grid">
          {activeDesignations.map((d) => {
            const isGestor = d.type === "gestor";
            const color = isGestor ? "var(--hb-orange)" : "var(--hb-cyan)";
            const bgColor = isGestor
              ? "var(--hb-orange-muted)"
              : "var(--hb-cyan-muted)";
            const Icon = isGestor ? UserCheck : UserCog;
            return (
              <div
                key={d.id}
                className="hb-card hb-designation-card"
                style={{ borderColor: color, background: bgColor }}
              >
                <div className="hb-designation-card-header">
                  <div
                    className="hb-designation-icon"
                    style={{ background: color }}
                  >
                    <Icon size={18} aria-hidden="true" />
                  </div>
                  <div>
                    <h3 className="hb-designation-title">
                      Diretor {isGestor ? "Gestor" : "Autorizador"}
                    </h3>
                    <p className="hb-designation-desc">
                      {isGestor
                        ? "Aprova lotes de pagamento e preside reuniões mensais."
                        : "Autoriza pagamentos no banco. Nunca pode ser o mesmo que o gestor."}
                    </p>
                  </div>
                </div>

                <div className="hb-designation-preview">
                  <div
                    className="hb-avatar hb-avatar-sm"
                    style={{ background: color }}
                    aria-hidden="true"
                  >
                    {getInitials(d.userName)}
                  </div>
                  <div>
                    <div className="hb-designation-preview-name">
                      {d.userName ?? "—"}
                    </div>
                    <div className="hb-designation-preview-sub">
                      Designado em {formatDate(d.assignedAt)}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {revokedCount > 0 && (
        <p style={{ marginTop: 12, fontSize: 12.5, color: "var(--fg-muted)" }}>
          {revokedCount} designaç
          {revokedCount === 1 ? "ão anterior" : "ões anteriores"} no histórico
          (ver trilha de auditoria).
        </p>
      )}

      <div className="hb-card" style={{ marginTop: 20, padding: 20 }}>
        <DesignationPanel
          directors={directors}
          designations={activeDesignations.map((d) => ({
            id: d.id,
            userId: d.userId,
            directorName: d.userName ?? "—",
            type: d.type,
            assignedAt: d.assignedAt,
          }))}
        />
      </div>
    </div>
  );
}

function FeatureFlagsPanel({
  flags,
}: {
  flags: Array<{
    id: string;
    key: string;
    enabled: boolean;
    description: string | null;
    rolloutPercent: number;
    updatedAt: Date;
  }>;
}) {
  return (
    <div>
      <div className="hb-info-banner">
        <b>Apenas para flags técnicas.</b> Controles de negócio (datas de
        janela, valores limite, percentuais de quórum) ficam em{" "}
        <i>Janelas & calendário</i> — feature flags são para deploys
        progressivos.
      </div>

      <div className="hb-card">
        <div className="hb-flag-list">
          {flags.map((f) => (
            <form action={handleToggleFlag} key={f.id} className="hb-flag-row">
              <input type="hidden" name="key" value={f.key} />
              <input type="hidden" name="enabled" value={String(f.enabled)} />
              <div className="hb-flag-meta">
                <div className="hb-flag-key-badge">{f.key}</div>
                {f.description && (
                  <div className="hb-flag-desc">{f.description}</div>
                )}
                <div className="hb-flag-meta-row">
                  {f.rolloutPercent > 0 && f.rolloutPercent < 100 && (
                    <span>{f.rolloutPercent}% de rollout</span>
                  )}
                  <span>{formatDateTime(f.updatedAt)}</span>
                </div>
              </div>
              <button
                type="submit"
                role="switch"
                aria-checked={f.enabled}
                aria-label={`${f.enabled ? "Desativar" : "Ativar"} ${f.key}`}
                className={`hb-switch${f.enabled ? " on" : ""}`}
              />
            </form>
          ))}
          {flags.length === 0 && (
            <p
              style={{
                padding: "24px 20px",
                fontSize: 13,
                color: "var(--fg-muted)",
              }}
            >
              Nenhuma feature flag cadastrada.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function EmailTemplatesPanel({
  templateRows,
  selectedSlug,
  onSave,
}: {
  templateRows: Array<{
    id: string;
    slug: string;
    subject: string;
    bodyHtml: string;
    bodyText: string;
    variables: string[];
    updatedBy: string | null;
    updatedAt: Date;
  }>;
  selectedSlug: EmailTemplateSlug;
  onSave: (data: EmailTemplateInput) => Promise<void>;
}) {
  const activeMeta = TEMPLATE_META.find((m) => m.slug === selectedSlug);
  if (!activeMeta) return null;

  const dbTemplate = templateRows.find((t) => t.slug === selectedSlug);
  const defaults = DEFAULT_EMAIL_TEMPLATES[selectedSlug];
  const isCustomized = !!dbTemplate;

  const template: EmailTemplate = {
    id: dbTemplate?.id ?? "",
    key: selectedSlug,
    subject: dbTemplate?.subject ?? defaults.subject,
    bodyHtml: dbTemplate?.bodyHtml ?? defaults.bodyHtml,
    bodyText: dbTemplate?.bodyText ?? defaults.bodyText,
    variables: dbTemplate?.variables ?? activeMeta.variables,
    updatedBy: dbTemplate?.updatedBy ?? "",
    updatedAt: dbTemplate?.updatedAt ?? new Date(),
  };

  const groups: TemplateGroup[] = [
    "Geral",
    "Projetos",
    "Financeiro",
    "Intranet",
  ];

  return (
    <div className="hb-settings-dual-col">
      {/* Sidebar */}
      <div className="hb-card hb-card-overflow">
        <div className="hb-tpl-sidebar-label">Templates</div>
        {groups.map((group) => (
          <div key={group}>
            {TEMPLATE_META.filter((m) => m.group === group).map((meta) => {
              const row = templateRows.find((t) => t.slug === meta.slug);
              const active = meta.slug === selectedSlug;
              return (
                <Link
                  key={meta.slug}
                  href={`/configuracoes?tab=email-templates&template=${meta.slug}`}
                  className={`hb-tpl-sidebar-item${active ? " active" : ""}`}
                >
                  <div className="hb-tpl-sidebar-item-name">{meta.label}</div>
                  <div className="hb-tpl-sidebar-item-key">{meta.slug}</div>
                  {row && (
                    <div className="hb-tpl-sidebar-item-date">
                      Atualizado em {formatDate(row.updatedAt)}
                    </div>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>

      {/* Editor + preview */}
      <div className="hb-tpl-editor">
        <div
          role="status"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            borderRadius: "var(--radius-sm)",
            background: isCustomized
              ? "color-mix(in srgb, var(--color-success) 12%, transparent)"
              : "color-mix(in srgb, var(--color-warning) 10%, transparent)",
            border: `1px solid color-mix(in srgb, ${isCustomized ? "var(--color-success)" : "var(--color-warning)"} 30%, transparent)`,
            fontSize: 12,
            color: isCustomized
              ? "var(--hb-green-deep)"
              : "var(--hb-orange-deep)",
          }}
        >
          {isCustomized ? (
            <>
              <Check size={13} aria-hidden="true" />
              Template personalizado — última edição em{" "}
              {formatDate(template.updatedAt)}
            </>
          ) : (
            <>
              <AlertCircle size={13} aria-hidden="true" />
              Usando texto padrão — salve para personalizar este template
            </>
          )}
        </div>

        <div className="hb-card">
          <div className="hb-card-header">
            <div>
              <h3>{activeMeta.label}</h3>
              <p className="hb-caption" style={{ margin: "2px 0 0" }}>
                {activeMeta.description}
              </p>
            </div>
          </div>
          <div className="hb-card-body">
            <EmailTemplateEditor template={template} onSubmit={onSave} />
          </div>
        </div>

        <div className="hb-card">
          <div className="hb-card-header">
            <h3>Pré-visualização do e-mail completo</h3>
            <div className="hb-card-header-actions">
              <span className="hb-card-header-hint">
                <Eye size={13} aria-hidden="true" />
                Variáveis aparecem destacadas.
              </span>
            </div>
          </div>
          <div className="hb-card-body">
            <EmailTemplatePreview
              subject={template.subject}
              bodyHtml={template.bodyHtml}
              variables={template.variables}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function SistemaPanel({
  settings,
  checklistTemplates,
}: {
  settings: Array<{
    id: string;
    key: string;
    value: unknown;
    label: string;
    description: string | null;
    isPublic: boolean;
    updatedAt: Date;
  }>;
  checklistTemplates: Array<{ id: string; name: string; isActive: boolean }>;
}) {
  return (
    <div>
      <div className="hb-note-banner">
        Configurações gerais do sistema. Alterações são registradas no log de
        auditoria.
      </div>
      <div className="hb-card hb-card-overflow">
        {settings.map((setting) => {
          if (setting.key === PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY) {
            const currentId =
              typeof setting.value === "string" ? setting.value : null;
            const current = checklistTemplates.find((t) => t.id === currentId);
            return (
              <div key={setting.id} className="hb-setting-row">
                <div>
                  <div className="hb-setting-label">{setting.label}</div>
                  {setting.description && (
                    <div className="hb-setting-desc">{setting.description}</div>
                  )}
                  <div className="hb-setting-key">{setting.key}</div>
                  {current && !current.isActive && (
                    <div
                      className="hb-setting-desc"
                      style={{ color: "var(--color-destructive)" }}
                    >
                      Template associado está inativo — escolha outro abaixo.
                    </div>
                  )}
                  {!current && (
                    <div
                      className="hb-setting-desc"
                      style={{ color: "var(--color-destructive)" }}
                    >
                      Template associado não foi encontrado.
                    </div>
                  )}
                </div>
                <form
                  action={handleSetChecklistTemplate}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <select
                    name="templateId"
                    defaultValue={currentId ?? ""}
                    className="hb-form-select"
                    style={{ width: "auto", minWidth: 220 }}
                    aria-label="Template de checklist de análise de projeto"
                  >
                    {checklistTemplates.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                        {!t.isActive ? " (inativo)" : ""}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    className="hb-btn hb-btn-secondary hb-btn-sm"
                  >
                    Salvar
                  </button>
                </form>
              </div>
            );
          }

          if (setting.key === PROJETOS_DUPLICATE_THRESHOLD_SETTING_KEY) {
            const currentValue =
              typeof setting.value === "number" ? setting.value : 0.92;
            return (
              <div key={setting.id} className="hb-setting-row">
                <div>
                  <div className="hb-setting-label">{setting.label}</div>
                  {setting.description && (
                    <div className="hb-setting-desc">{setting.description}</div>
                  )}
                  <div className="hb-setting-key">{setting.key}</div>
                </div>
                <form
                  action={handleSetDuplicateThreshold}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flexShrink: 0,
                  }}
                >
                  <input
                    type="number"
                    name="threshold"
                    defaultValue={currentValue}
                    min={0}
                    max={1}
                    step={0.01}
                    className="hb-form-input"
                    style={{ width: 90 }}
                    aria-label="Limiar de similaridade para duplicidade de projetos"
                  />
                  <button
                    type="submit"
                    className="hb-btn hb-btn-secondary hb-btn-sm"
                  >
                    Salvar
                  </button>
                </form>
              </div>
            );
          }

          return (
            <div key={setting.id} className="hb-setting-row">
              <div>
                <div className="hb-setting-label">{setting.label}</div>
                {setting.description && (
                  <div className="hb-setting-desc">{setting.description}</div>
                )}
                <div className="hb-setting-key">{setting.key}</div>
              </div>
              <div className="hb-setting-value">
                <span className="hb-setting-value-badge">
                  {String(setting.value)}
                </span>
                <span className="hb-setting-value-date">
                  {formatDate(setting.updatedAt)}
                </span>
              </div>
            </div>
          );
        })}
        {settings.length === 0 && (
          <p
            style={{
              padding: "24px 20px",
              fontSize: 13,
              color: "var(--fg-muted)",
            }}
          >
            Nenhuma configuração encontrada.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function ConfiguracoesPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; template?: string; userId?: string }>;
}) {
  const params = await searchParams;
  const activeTab = (params.tab ?? "designacoes") as TabId;
  const activeEmailTemplateSlug = validateEmailTemplateSlug(params.template);

  async function saveEmailTemplate(data: EmailTemplateInput) {
    "use server";

    const cookieStore = await cookies();
    const { actorId, roles } = await resolveSession(cookieStore);

    if (!roles.includes("super_admin")) {
      throw new Error(
        "Acesso negado: apenas super_admin pode editar templates",
      );
    }

    const allText = `${data.subject} ${data.bodyHtml} ${data.bodyText}`;
    const vars = [
      ...new Set(
        (allText.match(/\{\{(\w+)\}\}/g) ?? []).map((m) => m.slice(2, -2)),
      ),
    ];

    await db
      .insert(emailTemplates)
      .values({
        slug: activeEmailTemplateSlug,
        subject: data.subject,
        bodyHtml: data.bodyHtml,
        bodyText: data.bodyText,
        variables: vars,
        updatedBy: actorId,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: emailTemplates.slug,
        set: {
          subject: data.subject,
          bodyHtml: data.bodyHtml,
          bodyText: data.bodyText,
          variables: vars,
          updatedBy: actorId,
          updatedAt: new Date(),
        },
      });

    await logAudit({
      actorId,
      action: "email_template.updated",
      entity: "email_template",
      diff: { slug: activeEmailTemplateSlug, subject: data.subject },
    });

    revalidatePath("/configuracoes");
  }

  // Fetch all data upfront (tabs switch client-side via URL)
  const [
    designationRows,
    flagRows,
    templateRows,
    settingRows,
    allUsers,
    allRoleAssignments,
    directorRows,
    checklistTemplateRows,
  ] = await Promise.all([
    db
      .select({
        id: designations.id,
        type: designations.type,
        userId: designations.userId,
        assignedBy: designations.assignedBy,
        assignedAt: designations.assignedAt,
        revokedAt: designations.revokedAt,
        userName: users.fullName,
      })
      .from(designations)
      .innerJoin(users, eq(designations.userId, users.id))
      .orderBy(asc(designations.assignedAt)),

    db.select().from(featureFlags).orderBy(asc(featureFlags.key)),

    db.select().from(emailTemplates).orderBy(asc(emailTemplates.slug)),

    db.select().from(systemSettings).orderBy(asc(systemSettings.key)),

    db
      .select({ id: users.id, fullName: users.fullName, email: users.email })
      .from(users)
      .orderBy(asc(users.fullName)),

    db
      .select({
        id: roleAssignments.id,
        userId: roleAssignments.userId,
        role: roleAssignments.role,
        scope: roleAssignments.scope,
        grantedAt: roleAssignments.grantedAt,
      })
      .from(roleAssignments)
      .where(isNull(roleAssignments.revokedAt)),

    db
      .selectDistinct({
        id: users.id,
        fullName: users.fullName,
        email: users.email,
      })
      .from(roleAssignments)
      .innerJoin(users, eq(roleAssignments.userId, users.id))
      .where(
        and(
          eq(roleAssignments.role, "diretor"),
          isNull(roleAssignments.revokedAt),
        ),
      ),

    db
      .select({
        id: taskTemplates.id,
        name: taskTemplates.name,
        isActive: taskTemplates.isActive,
      })
      .from(taskTemplates)
      .orderBy(asc(taskTemplates.name)),
  ]);

  const directors = directorRows.map((d) => ({
    id: d.id,
    name: d.fullName ?? d.email,
  }));

  const activeDesignationRows = designationRows.filter(
    (d) => d.revokedAt === null,
  );
  const revokedDesignationCount =
    designationRows.length - activeDesignationRows.length;

  return (
    <div className="hb-page">
      <div className="hb-page-header">
        <div className="hb-page-header-meta">
          <div className="hb-eyebrow">Painel · operação do sistema</div>
          <h1 className="hb-page-title">Configurações</h1>
          <p className="hb-page-subtitle">
            Designações de governança, feature flags técnicas e textos
            institucionais que circulam por todo o ecossistema.
          </p>
        </div>
      </div>

      {/* Tab navigation — URL-based */}
      <div
        className="hb-tabs"
        role="tablist"
        aria-label="Seções de configuração"
      >
        {TABS.map((tab) => (
          <Link
            key={tab.id}
            href={`/configuracoes?tab=${tab.id}`}
            role="tab"
            aria-selected={activeTab === tab.id}
            className={`hb-tab${activeTab === tab.id ? " active" : ""}`}
          >
            {tab.icon}
            {tab.label}
          </Link>
        ))}
      </div>

      <div role="tabpanel">
        {activeTab === "designacoes" && (
          <DesignacoesPanel
            activeDesignations={activeDesignationRows}
            revokedCount={revokedDesignationCount}
            directors={directors}
          />
        )}
        {activeTab === "roles" && (
          <RoleAssignmentPanel
            users={allUsers.map((u) => ({
              id: u.id,
              name: u.fullName ?? u.email,
            }))}
            assignments={allRoleAssignments.map((a) => ({
              id: a.id,
              userId: a.userId,
              role: a.role,
              scope: a.scope as RoleAssignmentInput["scope"],
              grantedAt: a.grantedAt,
            }))}
            defaultUserId={params.userId}
          />
        )}
        {activeTab === "feature-flags" && (
          <FeatureFlagsPanel flags={flagRows} />
        )}
        {activeTab === "email-templates" && (
          <EmailTemplatesPanel
            templateRows={templateRows}
            selectedSlug={activeEmailTemplateSlug}
            onSave={saveEmailTemplate}
          />
        )}
        {activeTab === "sistema" && (
          <SistemaPanel
            settings={settingRows}
            checklistTemplates={checklistTemplateRows}
          />
        )}
      </div>
    </div>
  );
}
