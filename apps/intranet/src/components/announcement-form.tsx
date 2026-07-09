"use client";

import { useId, useState } from "react";
import {
  createAnnouncementSchema,
  type CreateAnnouncementInput,
} from "@hebron/validators/intranet";
import type { AnnouncementPriority } from "@hebron/types/intranet";
import {
  Button,
  FormField,
  Input,
  RichTextEditor,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import { AlertTriangle, Megaphone, TriangleAlert } from "lucide-react";

const PRIORITY_OPTIONS: Array<{
  value: AnnouncementPriority;
  label: string;
  icon: typeof Megaphone;
}> = [
  { value: "normal", label: "Normal", icon: Megaphone },
  { value: "importante", label: "Importante", icon: AlertTriangle },
  { value: "urgente", label: "Urgente", icon: TriangleAlert },
];

export interface AnnouncementFormProps {
  initialValues?: Partial<CreateAnnouncementInput>;
  onSubmit: (values: CreateAnnouncementInput) => void;
  onCancel?: () => void;
  isLoading?: boolean;
}

export function AnnouncementForm({
  initialValues,
  onSubmit,
  onCancel,
  isLoading = false,
}: AnnouncementFormProps) {
  const titleId = useId();
  const bodyId = useId();

  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [body, setBody] = useState(initialValues?.body ?? "");
  const [priority, setPriority] = useState<AnnouncementPriority>(
    initialValues?.priority ?? "normal",
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const candidate = { title, body, priority };
    const result = createAnnouncementSchema.safeParse(candidate);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        nextErrors[issue.path.join(".")] = issue.message;
      }
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    onSubmit(result.data);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-5">
      <FormField id={titleId} label="Título" required error={errors.title}>
        <Input
          id={titleId}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Assembleia geral marcada para 25 de julho"
          hasError={!!errors.title}
        />
      </FormField>

      <FormField label="Prioridade" required>
        <Select
          value={priority}
          onValueChange={(v) => setPriority(v as AnnouncementPriority)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PRIORITY_OPTIONS.map(({ value, label, icon: Icon }) => (
              <SelectItem key={value} value={value}>
                <span className="flex items-center gap-2">
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  {label}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        id={bodyId}
        label="Corpo do anúncio"
        required
        error={errors.body}
      >
        <RichTextEditor
          id={bodyId}
          value={body}
          onChange={setBody}
          placeholder="Escreva o conteúdo do anúncio…"
          aria-invalid={!!errors.body}
        />
      </FormField>

      <div className="flex items-center justify-end gap-3 border-t border-(--divider) pt-4">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <Button type="submit" loading={isLoading}>
          Publicar anúncio
        </Button>
      </div>
    </form>
  );
}
