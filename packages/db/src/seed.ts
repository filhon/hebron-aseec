import { fileURLToPath } from "node:url";
import { and, eq } from "drizzle-orm";

// dotenv precisa terminar antes de qualquer módulo que leia DATABASE_URL no
// escopo do módulo (./client, importado transitivamente por ./system-actor e
// ./settings) — um `import` estático é hoisted para o topo do arquivo em ESM
// e rodaria antes do config() abaixo, então o carregamento do resto do
// gráfico é adiado para dentro de `ensureEnvLoaded` via `import()` dinâmico
// (mesmo problema que packages/db/src/__tests__/setup-env.ts resolve para os
// testes, rodando como setupFile antes de qualquer import estático).
async function ensureEnvLoaded(): Promise<void> {
  if (process.env.DATABASE_URL) return;
  const { config } = await import("dotenv");
  config({ path: "../../.env" });
  config({ path: "../../.env.local", override: true });
}

// ---------------------------------------------------------------------------
// seedProjetosChecklistTemplate — PATCH-019 / débito registrado em S-83.
//
// `onProjectSubmitted` (packages/integrations/src/projetos-tarefas.ts) já
// cria o checklist de análise via createAutoTaskChecklist, mas depende de
// admin.system_settings["projetos_analysis_checklist_template"] apontar
// para um tarefas.task_templates ativo com itens. Nenhuma migration ou UI
// cria essa chave/template — em um ambiente novo, a primeira submissão real
// falha e só notifica super_admin, sem lhe dar meio de resolver. Este seed
// fecha o buraco: idempotente, roda com `pnpm db:seed` (ou automaticamente,
// se um dia entrar em pipeline de provisionamento de ambiente).
//
// Não é uma migration SQL porque `task_templates.created_by` e
// `system_settings.updated_by` são NOT NULL com FK para `public.users`, e o
// único ator "de sistema" (getSystemActorId) é provisionado via Supabase
// Admin API — não existe como INSERT puro em SQL (ver comentário em
// system-actor.ts).
// ---------------------------------------------------------------------------

export const PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY =
  "projetos_analysis_checklist_template";

const PROJETOS_CHECKLIST_TEMPLATE_NAME = "Checklist de análise de projeto";

const CHECKLIST_ITEMS: Array<{
  title: string;
  priority: "baixa" | "media" | "alta" | "urgente";
  dueOffsetDays: number | null;
}> = [
  {
    title: "Validar documentação enviada",
    priority: "alta",
    dueOffsetDays: 3,
  },
  {
    title: "Revisar resumo e versão compacta",
    priority: "media",
    dueOffsetDays: 5,
  },
  {
    title: "Conferir orçamento e teto institucional",
    priority: "alta",
    dueOffsetDays: 5,
  },
  {
    title: "Preparar pauta de avaliação",
    priority: "media",
    dueOffsetDays: 7,
  },
  {
    title: "Registrar pendências para o submissor, se houver",
    priority: "media",
    dueOffsetDays: 7,
  },
];

export interface SeedProjetosChecklistTemplateResult {
  templateId: string;
  /** false quando o seed encontrou configuração válida e não mudou nada. */
  created: boolean;
}

export async function seedProjetosChecklistTemplate(): Promise<SeedProjetosChecklistTemplateResult> {
  await ensureEnvLoaded();
  const [
    { db },
    { taskTemplates, templateItems, workspaces },
    { systemSettings },
    { getSystemActorId },
    { getSystemSetting },
  ] = await Promise.all([
    import("./client"),
    import("./schema/tarefas"),
    import("./schema/admin"),
    import("./system-actor"),
    import("./settings"),
  ]);

  const existingTemplateId = await getSystemSetting<string>(
    PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY,
  );
  if (existingTemplateId) {
    const [existingTemplate] = await db
      .select()
      .from(taskTemplates)
      .where(eq(taskTemplates.id, existingTemplateId))
      .limit(1);
    if (existingTemplate?.isActive) {
      return { templateId: existingTemplate.id, created: false };
    }
  }

  const [workspace] = await db
    .select({ id: workspaces.id })
    .from(workspaces)
    .where(eq(workspaces.slug, "administrativo"))
    .limit(1);
  if (!workspace) {
    throw new Error(
      'Workspace "administrativo" não encontrado — rode as migrations de tarefas (0031_tarefas.sql) antes do seed.',
    );
  }

  const systemActorId = await getSystemActorId();

  const [reusableTemplate] = await db
    .select()
    .from(taskTemplates)
    .where(
      and(
        eq(taskTemplates.name, PROJETOS_CHECKLIST_TEMPLATE_NAME),
        eq(taskTemplates.workspaceId, workspace.id),
      ),
    )
    .limit(1);

  let templateId: string;
  let created: boolean;

  if (reusableTemplate) {
    templateId = reusableTemplate.id;
    created = false;

    const existingItems = await db
      .select({ id: templateItems.id })
      .from(templateItems)
      .where(eq(templateItems.taskTemplateId, reusableTemplate.id))
      .limit(1);

    if (existingItems.length === 0) {
      await db.insert(templateItems).values(
        CHECKLIST_ITEMS.map((item, index) => ({
          taskTemplateId: reusableTemplate.id,
          title: item.title,
          priority: item.priority,
          dueOffsetDays: item.dueOffsetDays,
          order: index,
        })),
      );
    }

    if (!reusableTemplate.isActive) {
      await db
        .update(taskTemplates)
        .set({ isActive: true, updatedAt: new Date() })
        .where(eq(taskTemplates.id, reusableTemplate.id));
    }
  } else {
    created = true;
    templateId = await db.transaction(async (tx) => {
      const [template] = await tx
        .insert(taskTemplates)
        .values({
          name: PROJETOS_CHECKLIST_TEMPLATE_NAME,
          description:
            "Checklist padrão criado automaticamente quando um projeto é submetido para análise.",
          workspaceId: workspace.id,
          triggerSourceModule: "projetos",
          triggerEvent: "project.submitted",
          isActive: true,
          createdBy: systemActorId,
        })
        .returning({ id: taskTemplates.id });
      if (!template) {
        throw new Error(
          "Falha ao criar template de checklist de análise de projeto",
        );
      }

      await tx.insert(templateItems).values(
        CHECKLIST_ITEMS.map((item, index) => ({
          taskTemplateId: template.id,
          title: item.title,
          priority: item.priority,
          dueOffsetDays: item.dueOffsetDays,
          order: index,
        })),
      );

      return template.id;
    });
  }

  await db
    .insert(systemSettings)
    .values({
      key: PROJETOS_CHECKLIST_TEMPLATE_SETTING_KEY,
      value: templateId,
      label: "Template de checklist de análise de projeto",
      description:
        "Template usado por Projetos → Tarefas ao submeter um projeto para análise (BRAIN §7).",
      updatedBy: systemActorId,
    })
    .onConflictDoUpdate({
      target: systemSettings.key,
      set: {
        value: templateId,
        updatedBy: systemActorId,
        updatedAt: new Date(),
      },
    });

  return { templateId, created };
}

// ---------------------------------------------------------------------------
// seedProjetosDuplicateThreshold — P-2.14 / débito registrado em sessão.
//
// O prompt original (PROMPTS.md P-2.14) lista só a migration + a coluna
// embedding + duplicate-detection.ts + o wiring em submitProject/Admin, mas
// "Limiar configurável no Admin" (critério de aceite) exige que a linha
// admin.system_settings["projetos_duplicate_threshold"] exista: a action
// genérica updateSystemSetting (apps/admin/src/actions/settings.ts) só
// atualiza chaves já cadastradas, e a UI (Configurações → Sistema) só lista
// o que está na tabela — sem seed, a configuração nunca aparece para editar.
// Mesmo motivo estrutural de seedProjetosChecklistTemplate acima:
// system_settings.updated_by é NOT NULL com FK para public.users, sem ator
// "de sistema" utilizável em SQL puro.
// ---------------------------------------------------------------------------

export const PROJETOS_DUPLICATE_THRESHOLD_SETTING_KEY =
  "projetos_duplicate_threshold";

export interface SeedProjetosDuplicateThresholdResult {
  /** false quando a chave já existia e nada mudou. */
  created: boolean;
}

export async function seedProjetosDuplicateThreshold(): Promise<SeedProjetosDuplicateThresholdResult> {
  await ensureEnvLoaded();
  const [
    { db },
    { systemSettings },
    { getSystemActorId },
    { getSystemSetting },
  ] = await Promise.all([
    import("./client"),
    import("./schema/admin"),
    import("./system-actor"),
    import("./settings"),
  ]);

  const existing = await getSystemSetting<number>(
    PROJETOS_DUPLICATE_THRESHOLD_SETTING_KEY,
  );
  if (existing !== null) return { created: false };

  const systemActorId = await getSystemActorId();

  await db
    .insert(systemSettings)
    .values({
      key: PROJETOS_DUPLICATE_THRESHOLD_SETTING_KEY,
      value: 0.92,
      label: "Limiar de similaridade para duplicidade de projetos",
      description:
        "Similaridade de cosseno (0–1) acima da qual um projeto submetido é sinalizado como possível duplicata para a diretoria (BRAIN §6.2, P-2.14). Alterar não recalcula projetos já submetidos.",
      updatedBy: systemActorId,
    })
    .onConflictDoNothing({ target: systemSettings.key });

  return { created: true };
}

// ---------------------------------------------------------------------------
// seedProjetosJanelaAnual — P-2.19 (CORRETIVO).
//
// AUDIT/06 §1.6: nada consultava data nenhuma antes de aceitar a submissão
// do projeto anual, apesar do PRD/Q51/BRAIN §6.2 exigirem uma janela
// aberto/fechado definida pelo super_admin. Mesmo motivo estrutural de
// seedProjetosDuplicateThreshold acima: sem esta linha, updateSystemSetting
// (genérica, apps/admin/src/actions/settings.ts) não tem o que atualizar.
// `isPublic: true` é deliberado — createAnnualDraft/submitProject leem esta
// chave dentro de `withAuthenticatedContext` (ator = submissor, RLS ativa,
// G6.2); sem is_public a leitura do submissor voltaria sempre vazia e a
// janela configurada pelo Admin nunca chegaria a valer para quem submete.
// Datas vazias = sem janela configurada = aberto (não quebra o que já
// funciona hoje).
// ---------------------------------------------------------------------------

export const PROJETOS_JANELA_ANUAL_SETTING_KEY = "projetos_janela_anual";

export interface ProjetosJanelaAnual {
  abertura: string;
  fechamento: string;
}

export interface SeedProjetosJanelaAnualResult {
  /** false quando a chave já existia e nada mudou. */
  created: boolean;
}

export async function seedProjetosJanelaAnual(): Promise<SeedProjetosJanelaAnualResult> {
  await ensureEnvLoaded();
  const [
    { db },
    { systemSettings },
    { getSystemActorId },
    { getSystemSetting },
  ] = await Promise.all([
    import("./client"),
    import("./schema/admin"),
    import("./system-actor"),
    import("./settings"),
  ]);

  const existing = await getSystemSetting<ProjetosJanelaAnual>(
    PROJETOS_JANELA_ANUAL_SETTING_KEY,
  );
  if (existing !== null) return { created: false };

  const systemActorId = await getSystemActorId();

  await db
    .insert(systemSettings)
    .values({
      key: PROJETOS_JANELA_ANUAL_SETTING_KEY,
      value: { abertura: "", fechamento: "" } satisfies ProjetosJanelaAnual,
      label: "Janela de submissão do projeto anual",
      description:
        "Intervalo de datas em que o projeto anual pode ser submetido (BRAIN §6.2, PRD item 2). Vazio = sem restrição, aberto o ano todo. Projeto pontual não usa esta janela (Q91/Q54).",
      isPublic: true,
      updatedBy: systemActorId,
    })
    .onConflictDoNothing({ target: systemSettings.key });

  return { created: true };
}

// ---------------------------------------------------------------------------
// seedEmailTemplates — P-1.10b.
//
// `admin.email_templates` nunca foi semeada: num banco novo, a aba
// Configurações → Templates de email (apps/admin/src/app/(dashboard)/
// configuracoes/page.tsx) renderiza vazia até o primeiro save manual de
// cada um dos 15 slugs. Este seed insere o mesmo texto padrão que a UI já
// usa como fallback (TEMPLATE_META / DEFAULT_EMAIL_TEMPLATES naquele
// arquivo) — mantém a tela idêntica visualmente antes/depois do seed.
// onConflictDoNothing: nunca sobrescreve uma customização já salva por
// super_admin.
// ---------------------------------------------------------------------------

interface EmailTemplateSeedEntry {
  slug: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
  variables: string[];
}

const EMAIL_TEMPLATE_DEFAULTS: EmailTemplateSeedEntry[] = [
  {
    slug: "invitation",
    variables: ["nome", "link", "papel"],
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
  {
    slug: "welcome",
    variables: ["nome", "link", "papel"],
    subject: "Bem-vindo(a) à Hebron Aseec",
    bodyHtml: `<p>Bem-vindo(a), <strong>{{nome}}</strong>.</p>
<p>Sua conta na plataforma <strong>Hebron Aseec</strong> foi ativada com sucesso.</p>
<p><strong>Acesso concedido:</strong> {{papel}}</p>
<p style="margin-top:24px;">
  <a href="{{link}}" style="background:#EA5A06;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Acessar plataforma</a>
</p>`,
    bodyText: `Bem-vindo(a), {{nome}}.\n\nSua conta foi ativada na plataforma Hebron Aseec.\n\nAcesso concedido: {{papel}}\n\nAcesse em: {{link}}`,
  },
  {
    slug: "password-reset",
    variables: ["nome", "link"],
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
  {
    slug: "projetos-submitted",
    variables: ["nome", "titulo", "submissor", "tipo", "organizacao", "link"],
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
  {
    slug: "projetos-in-validation",
    variables: ["nome", "titulo", "link"],
    subject: "Projeto em análise: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Seu projeto <strong>{{titulo}}</strong> foi recebido e está sendo analisado pela equipe de administração da Hebron Aseec.</p>
<p>Você será notificado sobre o resultado da análise.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver projeto</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nSeu projeto "{{titulo}}" está sendo analisado pela administração.\n\nAcesse: {{link}}`,
  },
  {
    slug: "projetos-voting-open",
    variables: ["nome", "titulo", "link"],
    subject: "Votação aberta: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>O projeto <strong>{{titulo}}</strong> está na fase de votação e aguarda sua participação.</p>
<p>Acesse o portal para registrar sua avaliação antes da reunião.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Avaliar projeto</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO projeto "{{titulo}}" aguarda sua avaliação.\n\nAcesse: {{link}}`,
  },
  {
    slug: "projetos-approved",
    variables: ["nome", "titulo", "link"],
    subject: "Projeto aprovado: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Temos uma boa notícia: o projeto <strong>{{titulo}}</strong> foi aprovado pela diretoria da Hebron Aseec após o período de homologação.</p>
<p>Os pagamentos serão processados conforme o cronograma aprovado.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#16A34A;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver detalhes</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nSeu projeto "{{titulo}}" foi aprovado pela diretoria da Hebron Aseec.\n\nAcesse: {{link}}`,
  },
  {
    slug: "projetos-rejected",
    variables: ["nome", "titulo", "link"],
    subject: "Atualização sobre seu projeto: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Após análise pela diretoria, o projeto <strong>{{titulo}}</strong> não foi aprovado neste ciclo.</p>
<p>Entre em contato com a administração para mais informações ou para submeter um novo projeto.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver detalhes</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO projeto "{{titulo}}" não foi aprovado neste ciclo.\n\nAcesse: {{link}}`,
  },
  {
    slug: "projetos-blocked",
    variables: ["nome", "titulo", "link"],
    subject: "Projeto bloqueado: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>O projeto <strong>{{titulo}}</strong> foi bloqueado por falta de relatório. Os pagamentos estão suspensos até a entrega do relatório pendente.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#DC2626;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Enviar relatório</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO projeto "{{titulo}}" foi bloqueado por falta de relatório.\n\nAcesse: {{link}}`,
  },
  {
    slug: "projetos-contested",
    // estagio (P-2.18 CORRETIVO): pontual retorna para "validação", anual
    // para "votação" — createContestation decide, notifyContestation informa.
    variables: ["nome", "titulo", "contestador", "link", "estagio"],
    subject: "Contestação de projeto: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Uma contestação foi registrada para o projeto <strong>{{titulo}}</strong> por <strong>{{contestador}}</strong>.</p>
<p>O projeto retorna para {{estagio}}. Acesse o portal para participar.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#EA5A06;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver contestação</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\n{{contestador}} registrou uma contestação no projeto "{{titulo}}". O projeto retorna para {{estagio}}.\n\nAcesse: {{link}}`,
  },
  {
    slug: "projetos-evaluator-designated",
    variables: ["nome", "titulo", "reuniao", "link"],
    subject: "Projetos designados para avaliação: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>Você foi designado para avaliar o projeto <strong>{{titulo}}</strong>.</p>
<p>A reunião de votação está agendada para <strong>{{reuniao}}</strong>. Acesse o portal para revisar os projetos com antecedência.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver projetos designados</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nVocê foi designado para avaliar "{{titulo}}".\nReunião: {{reuniao}}\n\nAcesse: {{link}}`,
  },
  {
    slug: "projetos-payment-made",
    variables: ["nome", "titulo", "valor", "data", "link"],
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
  {
    // P-2.16 CORRETIVO — PRD item 8: enviado ao submissor a cada alteração
    // feita pelo super_admin num projeto em validação. `{{alteracoes}}` é
    // HTML pré-renderizado (linhas de tabela), mesmo padrão de
    // `{{kpis}}`/`{{eventos}}` em "intranet-briefing" abaixo.
    slug: "projetos-project-updated",
    variables: ["nome", "titulo", "alteracoes", "link"],
    subject: "Alterações no seu projeto: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>A diretoria da Hebron Aseec alterou informações do projeto <strong>{{titulo}}</strong>, atualmente em validação. Confira o que mudou abaixo.</p>
<table style="width:100%;border-collapse:collapse;margin:16px 0;background:#F9FAFB;border-radius:8px;padding:16px;">
{{alteracoes}}
</table>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Ver projeto</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nA diretoria alterou informações do projeto "{{titulo}}", atualmente em validação.\n\nAcesse: {{link}}`,
  },
  {
    slug: "report-reminder-7d-before",
    variables: ["nome", "titulo", "prazo", "link"],
    subject: "Relatório vence em 7 dias: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>O relatório do projeto <strong>{{titulo}}</strong> deve ser entregue até <strong>{{prazo}}</strong>. Você ainda tem 7 dias.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#202C85;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Enviar relatório</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO relatório do projeto "{{titulo}}" vence em {{prazo}}.\n\nAcesse: {{link}}`,
  },
  {
    slug: "report-reminder-due-today",
    variables: ["nome", "titulo", "link"],
    subject: "Relatório vence hoje: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>O prazo para entrega do relatório do projeto <strong>{{titulo}}</strong> é <strong>hoje</strong>.</p>
<p>Envie seu relatório agora para evitar o bloqueio de pagamentos.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#EA5A06;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Enviar relatório</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO relatório do projeto "{{titulo}}" vence HOJE.\n\nAcesse: {{link}}`,
  },
  {
    slug: "report-reminder-expiry",
    variables: ["nome", "titulo", "prazo", "link"],
    subject: "Relatório em atraso: {{titulo}}",
    bodyHtml: `<p>Olá, <strong>{{nome}}</strong>,</p>
<p>O relatório do projeto <strong>{{titulo}}</strong> está em atraso. O prazo final de expiração é <strong>{{prazo}}</strong>.</p>
<p>Após esta data, os pagamentos poderão ser bloqueados permanentemente.</p>
<p style="margin-top:20px;">
  <a href="{{link}}" style="background:#DC2626;color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:700;display:inline-block;">Enviar relatório urgente</a>
</p>`,
    bodyText: `Olá, {{nome}},\n\nO relatório do projeto "{{titulo}}" está em atraso. Prazo de expiração: {{prazo}}.\n\nAcesse: {{link}}`,
  },
  {
    slug: "financeiro-batch-approval",
    variables: [
      "nome",
      "semanaInicio",
      "semanaFim",
      "quantidade",
      "valorTotal",
      "link",
    ],
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
  {
    slug: "financeiro-budget-alert",
    variables: [
      "nome",
      "centroCusto",
      "ano",
      "valorOrcado",
      "valorExecutado",
      "percentual",
      "link",
    ],
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
  {
    slug: "financeiro-monthly-report",
    variables: [
      "nome",
      "mes",
      "ano",
      "receitas",
      "despesas",
      "resultado",
      "link",
    ],
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
  {
    slug: "intranet-urgent-announcement",
    variables: ["nome", "titulo", "corpo", "autor", "dataPublicacao", "link"],
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
  {
    slug: "intranet-briefing",
    variables: ["nome", "cadencia", "periodo", "kpis", "eventos", "link"],
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
];

export interface SeedEmailTemplatesResult {
  inserted: number;
}

export async function seedEmailTemplates(): Promise<SeedEmailTemplatesResult> {
  await ensureEnvLoaded();
  const [{ db }, { emailTemplates }, { getSystemActorId }] = await Promise.all([
    import("./client"),
    import("./schema/admin"),
    import("./system-actor"),
  ]);

  const systemActorId = await getSystemActorId();

  const insertedRows = await db
    .insert(emailTemplates)
    .values(
      EMAIL_TEMPLATE_DEFAULTS.map((t) => ({
        slug: t.slug,
        subject: t.subject,
        bodyHtml: t.bodyHtml,
        bodyText: t.bodyText,
        variables: t.variables,
        updatedBy: systemActorId,
      })),
    )
    .onConflictDoNothing()
    .returning({ id: emailTemplates.id });

  return { inserted: insertedRows.length };
}

async function main() {
  // PACOTE 5 (AUDIT/04-BACKLOG-CORRECAO.md, P-9.5): um único `pnpm db:seed`
  // cobre tudo que P-9.5 pede — os passos abaixo importam de ./seed/* em vez
  // de duplicar lógica; cada um continua rodável isoladamente pelo seu
  // próprio script (db:seed:flats-tarefas, db:seed:producao).
  const [
    { seedFlatsCleaningTemplates },
    { seedChartOfAccounts, seedSuperAdmins, seedDesignations },
  ] = await Promise.all([
    import("./seed/tarefas-templates"),
    import("./seed/producao"),
  ]);

  const result = await seedProjetosChecklistTemplate();
  console.log(
    result.created
      ? `Criado template "${PROJETOS_CHECKLIST_TEMPLATE_NAME}" (${result.templateId}) e configurado admin.system_settings.`
      : `Checklist de análise de projeto já configurado (${result.templateId}) — nada a fazer.`,
  );

  const duplicateThresholdResult = await seedProjetosDuplicateThreshold();
  console.log(
    duplicateThresholdResult.created
      ? `Criada configuração "${PROJETOS_DUPLICATE_THRESHOLD_SETTING_KEY}" (padrão 0.92) em admin.system_settings.`
      : `Limiar de duplicidade de projetos já configurado — nada a fazer.`,
  );

  const janelaAnualResult = await seedProjetosJanelaAnual();
  console.log(
    janelaAnualResult.created
      ? `Criada configuração "${PROJETOS_JANELA_ANUAL_SETTING_KEY}" (sem datas — aberto) em admin.system_settings.`
      : `Janela de submissão do projeto anual já configurada — nada a fazer.`,
  );

  const emailTemplatesResult = await seedEmailTemplates();
  console.log(
    emailTemplatesResult.inserted > 0
      ? `Semeados ${emailTemplatesResult.inserted} template(s) de e-mail em admin.email_templates.`
      : "Templates de e-mail já semeados — nada a fazer.",
  );

  const cleaningResult = await seedFlatsCleaningTemplates();
  for (const [name, { templateId, created }] of Object.entries(
    cleaningResult.templates,
  )) {
    console.log(
      created
        ? `Criado template de limpeza "${name}" (${templateId}).`
        : `Template de limpeza "${name}" já existia (${templateId}) — nada a fazer.`,
    );
  }

  const chartResult = await seedChartOfAccounts();
  console.log(
    chartResult.inserted > 0
      ? `Plano de contas: ${chartResult.inserted} categoria(s) criada(s) (inclui "Doações").`
      : 'Plano de contas já semeado — nada a fazer (categoria "Doações" já existe).',
  );

  const adminsResult = await seedSuperAdmins();
  if (adminsResult.skippedReason) {
    console.warn(adminsResult.skippedReason);
  } else {
    for (const p of adminsResult.processed) {
      console.log(
        `super_admin ${p.email}: ${p.created ? "conta criada" : "conta já existia"}, papel ${p.roleGranted ? "concedido agora" : "já concedido"}.`,
      );
    }
  }

  const designationsResult = await seedDesignations();
  for (const p of designationsResult.processed) {
    console.log(
      `Designação ${p.label} → ${p.email}: ${p.granted ? "concedida agora" : "já concedida"}.`,
    );
  }
  for (const s of designationsResult.skipped) {
    console.warn(`Designação ${s.label} não processada: ${s.reason}`);
  }

  // `db` (./client) é um pool compartilhado sem `.end()` exposto (singleton
  // pensado para o runtime da app, reaproveitado aqui por getSystemActorId/
  // getSystemSetting) — sem isto o processo do script nunca sai sozinho.
  process.exit(0);
}

// Só roda o seed quando este arquivo é executado diretamente (tsx src/seed.ts),
// nunca quando importado por testes (packages/db/src/__tests__/seed.test.ts).
const isMain =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === process.argv[1];

if (isMain) {
  main().catch((err: unknown) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
}
