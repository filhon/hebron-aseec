import { Resend } from "resend";
import type * as React from "react";
import { renderAsync } from "@react-email/components";

// ——————————————————————————————————————
// Types
// ——————————————————————————————————————

export type NotificationChannel = "in_app" | "email";

export interface NotificationInsertData {
  userId: string;
  channel: NotificationChannel;
  type: string;
  title: string;
  body?: string;
  payload?: Record<string, unknown>;
}

export interface NotificationRecord extends NotificationInsertData {
  id: string;
  readAt: null;
  sentAt: string | null;
  createdAt: string;
}

/**
 * Função de inserção injetada pelo consumidor.
 * Recebe os dados da notificação e retorna o id gerado.
 */
export type InsertNotificationFn = (
  data: NotificationInsertData & { sentAt?: string },
) => Promise<{ id: string }>;

export interface SendEmailOptions {
  /** Endereço de email do destinatário */
  to: string;
  /** Endereço(s) de email em cópia (CC) */
  cc?: string | string[];
  /**
   * Componente React Email a ser renderizado como corpo do email.
   * Obrigatório quando `html` não é fornecido.
   */
  template?: React.ReactElement;
  /**
   * HTML bruto a ser enviado diretamente via Resend.
   * Usado quando o admin sobrescreveu o template via Admin.
   * Tem precedência sobre `template` quando ambos estão presentes.
   */
  html?: string;
  /** Assunto do email (padrão: o title da notificação) */
  subject?: string;
  /** Endereço "De" (padrão: noreply@hebronaseec.com.br) */
  from?: string;
  /**
   * Anexos (ex.: PDF/XLSX do relatório mensal — P-3.10). Repassado
   * diretamente à API do Resend, que aceita `content` como Buffer ou string
   * base64.
   */
  attachments?: { filename: string; content: Buffer | string }[];
}

export interface CreateNotificationOptions {
  /** Função que insere a notificação no banco de dados */
  insert: InsertNotificationFn;
  /** Dados da notificação */
  data: NotificationInsertData;
  /**
   * Obrigatório quando channel = "email".
   * Contém destinatário e template React Email a ser renderizado.
   */
  email?: SendEmailOptions;
  /** Resend API Key (padrão: process.env.RESEND_API_KEY) */
  resendApiKey?: string;
}

// ——————————————————————————————————————
// createNotification
// ——————————————————————————————————————

/**
 * Insere uma notificação no banco de dados e, se canal = "email",
 * dispara o email via Resend.
 *
 * @example
 * ```ts
 * await createNotification({
 *   insert: (d) => db.insert(notifications).values(d).returning({ id: notifications.id }).then(r => r[0]),
 *   data: {
 *     userId: user.id,
 *     channel: "email",
 *     type: "candidatura_recebida",
 *     title: "Candidatura recebida",
 *     body: "Sua candidatura foi recebida com sucesso.",
 *     payload: { href: "/projetos/123/candidaturas" },
 *   },
 *   email: {
 *     to: user.email,
 *     template: <CandidaturaEmail projeto="Nome do Projeto" />,
 *   },
 * });
 * ```
 */
export async function createNotification({
  insert,
  data,
  email,
  resendApiKey,
}: CreateNotificationOptions): Promise<{ id: string }> {
  // Callers should inject the API key from their env (e.g. process.env.RESEND_API_KEY)
  const apiKey = resendApiKey;

  let sentAt: string | undefined;

  // ── Email dispatch ───────────────────────────────────────
  if (data.channel === "email") {
    if (!email) {
      throw new Error(
        'createNotification: "email" option é obrigatório quando channel = "email"',
      );
    }

    if (!apiKey) {
      throw new Error("createNotification: RESEND_API_KEY não configurado");
    }

    const resend = new Resend(apiKey);

    let html: string;
    if (email.html) {
      html = email.html;
    } else if (email.template) {
      html = await renderAsync(email.template);
    } else {
      throw new Error(
        'createNotification: "email.template" ou "email.html" é obrigatório quando channel = "email"',
      );
    }

    const { error } = await resend.emails.send({
      from: email.from ?? "Hebron Aseec <noreply@hebronaseec.com.br>",
      to: email.to,
      cc: email.cc,
      subject: email.subject ?? data.title,
      html,
      attachments: email.attachments,
    });

    if (error) {
      throw new Error(`Falha ao enviar email via Resend: ${error.message}`);
    }

    sentAt = new Date().toISOString();
  }

  // ── DB insert ────────────────────────────────────────────
  const record = await insert({ ...data, sentAt });

  return record;
}
