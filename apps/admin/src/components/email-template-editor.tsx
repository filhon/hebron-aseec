"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button, FormField, Input } from "@hebron/ui";
import {
  emailTemplateSchema,
  type EmailTemplateInput,
} from "@hebron/validators";
import type { EmailTemplate } from "@hebron/types/admin";

// ─── Props ────────────────────────────────────────────────────────────────────

interface EmailTemplateEditorProps {
  template: EmailTemplate;
  onSubmit: (data: EmailTemplateInput) => void | Promise<void>;
  isLoading?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function EmailTemplateEditor({
  template,
  onSubmit,
  isLoading,
}: EmailTemplateEditorProps) {
  const {
    register,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<EmailTemplateInput>({
    resolver: zodResolver(emailTemplateSchema),
    defaultValues: {
      key: template.key,
      subject: template.subject,
      bodyHtml: template.bodyHtml,
      bodyText: template.bodyText,
    },
  });

  const loading = isLoading ?? isSubmitting;
  const watchedSubject = watch("subject");
  const watchedBodyHtml = watch("bodyHtml");

  // Replace {{variable}} placeholders with styled spans for the preview
  function renderPreview(html: string) {
    return html.replace(
      /\{\{(\w+)\}\}/g,
      (_, name: string) =>
        `<span style="background:#202C85;color:#fff;padding:0 4px;border-radius:3px;font-family:monospace;font-size:12px;">{{${name}}}</span>`,
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Variables reference */}
      {template.variables.length > 0 && (
        <div className="flex flex-wrap gap-2">
          <span className="text-[--text-xs] text-[--color-muted-foreground]">
            Variáveis disponíveis:
          </span>
          {template.variables.map((v) => (
            <code
              key={v}
              className={[
                "rounded px-1.5 py-0.5",
                "bg-[--color-primary]/10 text-[--color-primary]",
                "text-[--text-xs] font-mono",
              ].join(" ")}
            >
              {`{{${v}}}`}
            </code>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data: EmailTemplateInput = {
            key: template.key,
            subject: watchedSubject,
            bodyHtml: watchedBodyHtml,
            bodyText: watch("bodyText"),
          };
          void onSubmit(data);
        }}
        className="flex flex-col gap-6"
        noValidate
      >
        {/* Assunto */}
        <FormField
          id="subject"
          label="Assunto"
          required
          error={errors.subject?.message}
        >
          <Input
            id="subject"
            type="text"
            placeholder="Assunto do e-mail"
            hasError={!!errors.subject}
            {...register("subject")}
          />
        </FormField>

        {/* Split view: HTML editor + preview */}
        <div className="flex flex-col gap-2">
          <span className="text-[--text-sm] font-medium text-[--color-foreground]">
            Corpo HTML{" "}
            <span
              className="ml-0.5 text-[--color-destructive]"
              aria-hidden="true"
            >
              *
            </span>
          </span>

          <div className="grid gap-3 lg:grid-cols-2">
            {/* Editor */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[--text-xs] font-medium text-[--color-muted-foreground] uppercase tracking-wide">
                Editor
              </span>
              <textarea
                id="bodyHtml"
                rows={16}
                placeholder="<p>Olá {{name}},</p>"
                className={[
                  "flex w-full resize-y font-mono",
                  "rounded-[--radius] border border-[--color-border]",
                  "bg-[--color-input-bg] text-[--color-foreground]",
                  "px-3 py-2 text-[--text-xs]",
                  "placeholder:text-[--color-muted-foreground]",
                  "transition-colors duration-[--transition-fast]",
                  "hover:border-[--color-primary]/50",
                  "focus-visible:outline-none focus-visible:border-[--color-primary]",
                  "focus-visible:ring-2 focus-visible:ring-[--color-ring]/20",
                  errors.bodyHtml
                    ? "border-[--color-destructive] focus-visible:ring-[--color-destructive]/20"
                    : "",
                ].join(" ")}
                {...register("bodyHtml")}
              />
              {errors.bodyHtml && (
                <p
                  role="alert"
                  className="text-[--text-xs] text-[--color-destructive]"
                >
                  {errors.bodyHtml.message}
                </p>
              )}
            </div>

            {/* Preview */}
            <div className="flex flex-col gap-1.5">
              <span className="text-[--text-xs] font-medium text-[--color-muted-foreground] uppercase tracking-wide">
                Pré-visualização
              </span>
              <div
                className={[
                  "min-h-[15rem] rounded-[--radius] border border-[--color-border]",
                  "bg-white px-4 py-3 text-[--text-sm]",
                  "overflow-auto",
                ].join(" ")}
              >
                {/* Subject preview */}
                {watchedSubject && (
                  <div className="mb-3 border-b border-[--color-border] pb-2">
                    <span className="text-[--text-xs] text-[--color-muted-foreground]">
                      Assunto:{" "}
                    </span>
                    <strong className="text-[--text-sm]">
                      {watchedSubject}
                    </strong>
                  </div>
                )}
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{
                    __html: renderPreview(watchedBodyHtml ?? ""),
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Corpo texto plano */}
        <FormField
          id="bodyText"
          label="Corpo texto plano"
          required
          hint="Versão sem formatação HTML para clientes de e-mail mais simples"
          error={errors.bodyText?.message}
        >
          <textarea
            id="bodyText"
            rows={6}
            placeholder="Olá {{name}}, você foi convidado para..."
            className={[
              "flex w-full resize-y",
              "rounded-[--radius] border border-[--color-border]",
              "bg-[--color-input-bg] text-[--color-foreground]",
              "px-3 py-2 text-[--text-sm]",
              "placeholder:text-[--color-muted-foreground]",
              "transition-colors duration-[--transition-fast]",
              "hover:border-[--color-primary]/50",
              "focus-visible:outline-none focus-visible:border-[--color-primary]",
              "focus-visible:ring-2 focus-visible:ring-[--color-ring]/20",
              errors.bodyText
                ? "border-[--color-destructive] focus-visible:ring-[--color-destructive]/20"
                : "",
            ].join(" ")}
            {...register("bodyText")}
          />
        </FormField>

        {/* Ações */}
        <div className="flex items-center justify-between border-t border-[--color-border] pt-4">
          <p className="text-[--text-xs] text-[--color-muted-foreground]">
            Última edição:{" "}
            {template.updatedAt.toLocaleDateString("pt-BR", {
              day: "2-digit",
              month: "long",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
          <Button type="submit" loading={loading} disabled={!isDirty}>
            Salvar template
          </Button>
        </div>
      </form>
    </div>
  );
}
