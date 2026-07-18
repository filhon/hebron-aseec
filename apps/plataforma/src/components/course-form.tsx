"use client";

import * as React from "react";
import type { z } from "zod";
import type {
  Course,
  CourseModule,
  Instructor,
  Series,
} from "@hebron/types/plataforma";
import {
  createCourseSchema,
  createCourseModuleSchema,
} from "@hebron/validators";
import {
  FormField,
  Input,
  RichTextEditor,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
} from "@hebron/ui";
import { ImagePlus, Loader2, X } from "lucide-react";
import {
  getCourseCoverUploadUrl,
  getCourseCoverReadUrl,
} from "../actions/uploads";

type CourseCoverMimeType = "image/jpeg" | "image/png" | "image/webp";

const COVER_MAX_SIZE_BYTES = 5 * 1024 * 1024;
const COVER_ALLOWED_MIME_TYPES: CourseCoverMimeType[] = [
  "image/jpeg",
  "image/png",
  "image/webp",
];

// Só é chamada depois que handleCoverChange já validou file.type contra
// COVER_ALLOWED_MIME_TYPES — a asserção abaixo reflete essa garantia.
//
// `storagePath` é o valor persistido (courses.cover_url) — `previewUrl` é só
// para a prévia imediata neste formulário, nunca enviado a onSubmit (S-05:
// persistir uma URL assinada em vez do path reproduz o bug de URL de longa
// duração propagada).
async function uploadCourseCover(
  file: File,
): Promise<{ storagePath: string; previewUrl: string }> {
  const urlResult = await getCourseCoverUploadUrl({
    fileName: file.name,
    mimeType: file.type as CourseCoverMimeType,
  });
  const uploadData = urlResult?.data;
  if (!uploadData) throw new Error("Não foi possível obter URL de upload.");

  const putRes = await fetch(uploadData.uploadUrl, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type },
  });
  if (!putRes.ok) throw new Error("Falha ao enviar imagem para o storage.");

  const readResult = await getCourseCoverReadUrl({
    storagePath: uploadData.storagePath,
  });
  const readData = readResult?.data;
  if (!readData) throw new Error("Não foi possível gerar a URL da imagem.");

  return { storagePath: uploadData.storagePath, previewUrl: readData.url };
}

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0]);
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

const OTHER_CATEGORY = "__outra__";
const NO_SERIES = "__sem_serie__";

// ─── CourseForm ─────────────────────────────────────────────────────────────

export interface CourseFormValues {
  title: string;
  slug: string;
  description: string;
  category: string;
  instructorId: string;
  seriesId: string | null;
  coverImageUrl: string | null;
}

export interface CourseFormProps {
  mode?: "create" | "edit";
  course?: Course;
  instructors: Instructor[];
  categories: string[];
  series: Series[];
  onSubmit: (values: CourseFormValues) => void;
  isLoading?: boolean;
  className?: string;
}

/** Criar/editar curso (título, descrição, categoria, instrutor, capa). */
export function CourseForm({
  mode = "create",
  course,
  instructors,
  categories,
  series,
  onSubmit,
  isLoading = false,
  className,
}: CourseFormProps) {
  const [title, setTitle] = React.useState(course?.title ?? "");
  const [slug, setSlug] = React.useState(course?.slug ?? "");
  const [description, setDescription] = React.useState(
    course?.description ?? "",
  );
  const [categorySelectValue, setCategorySelectValue] = React.useState(() =>
    course && !categories.includes(course.category)
      ? OTHER_CATEGORY
      : (course?.category ?? ""),
  );
  const [customCategory, setCustomCategory] = React.useState(
    course && !categories.includes(course.category) ? course.category : "",
  );
  const [instructorId, setInstructorId] = React.useState(
    course?.instructorId ?? instructors[0]?.id ?? "",
  );
  const [seriesSelectValue, setSeriesSelectValue] = React.useState(
    course?.seriesId ?? NO_SERIES,
  );
  // course?.coverImageUrl (modo edição) é o storage path cru, não uma URL
  // exibível (getCourseForEditor não resolve — ver nota em lib/queries.ts) —
  // a prévia é resolvida à parte no efeito abaixo; coverImageUrl é o valor
  // reenviado a onSubmit e começa como o próprio path já persistido.
  const [coverPreview, setCoverPreview] = React.useState<string | null>(null);
  const [coverImageUrl, setCoverImageUrl] = React.useState<string | null>(
    course?.coverImageUrl ?? null,
  );
  const [coverUploadStatus, setCoverUploadStatus] = React.useState<
    "idle" | "uploading" | "error"
  >("idle");
  const [coverUploadError, setCoverUploadError] = React.useState<string | null>(
    null,
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  const fileInputRef = React.useRef<HTMLInputElement>(null);
  // Blob local do preview: só é revogado ao trocar/remover a imagem ou ao
  // desmontar — nunca logo após o upload, senão a prévia quebra caso o
  // upload falhe e o usuário ainda esteja olhando para o arquivo escolhido.
  const localPreviewRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    return () => {
      if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    };
  }, []);

  // Resolve a prévia da capa já existente (modo edição) a partir do storage
  // path persistido — sob demanda, mesmo padrão do upload (S-05).
  React.useEffect(() => {
    if (!course?.coverImageUrl) return;
    let cancelled = false;

    getCourseCoverReadUrl({ storagePath: course.coverImageUrl }).then(
      (result) => {
        if (!cancelled && result?.data) setCoverPreview(result.data.url);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [course?.coverImageUrl]);

  const category =
    categorySelectValue === OTHER_CATEGORY
      ? customCategory
      : categorySelectValue;

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (!file) return;

    if (!(COVER_ALLOWED_MIME_TYPES as string[]).includes(file.type)) {
      setCoverUploadStatus("error");
      setCoverUploadError("Formato não suportado. Use JPEG, PNG ou WebP.");
      return;
    }
    if (file.size > COVER_MAX_SIZE_BYTES) {
      setCoverUploadStatus("error");
      setCoverUploadError("Imagem muito grande. Tamanho máximo: 5 MB.");
      return;
    }

    if (localPreviewRef.current) URL.revokeObjectURL(localPreviewRef.current);
    const previewUrl = URL.createObjectURL(file);
    localPreviewRef.current = previewUrl;
    setCoverPreview(previewUrl);
    setCoverImageUrl(null);
    setCoverUploadStatus("uploading");
    setCoverUploadError(null);

    uploadCourseCover(file)
      .then(({ storagePath, previewUrl }) => {
        setCoverImageUrl(storagePath);
        setCoverPreview(previewUrl);
        setCoverUploadStatus("idle");
        if (localPreviewRef.current) {
          URL.revokeObjectURL(localPreviewRef.current);
          localPreviewRef.current = null;
        }
      })
      .catch(() => {
        setCoverUploadStatus("error");
        setCoverUploadError("Falha ao enviar imagem. Tente novamente.");
      });
  }

  function removeCover() {
    if (localPreviewRef.current) {
      URL.revokeObjectURL(localPreviewRef.current);
      localPreviewRef.current = null;
    }
    setCoverPreview(null);
    setCoverImageUrl(null);
    setCoverUploadStatus("idle");
    setCoverUploadError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (coverUploadStatus === "uploading") return;

    const seriesId = seriesSelectValue === NO_SERIES ? null : seriesSelectValue;

    const result = createCourseSchema.safeParse({
      title,
      slug,
      description,
      category,
      instructorId,
      seriesId,
      coverImageUrl,
      isPublished: course?.isPublished ?? false,
    });

    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }

    setErrors({});
    onSubmit({
      title: result.data.title,
      slug: result.data.slug,
      description: result.data.description,
      category: result.data.category,
      instructorId: result.data.instructorId,
      seriesId: result.data.seriesId,
      coverImageUrl: result.data.coverImageUrl,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-5", className)}
    >
      <FormField label="Título" error={errors.title} required>
        <Input
          value={title}
          onChange={(e) => {
            setTitle(e.target.value);
            setSlug(slugify(e.target.value));
          }}
          placeholder="Ex.: Fundamentos da Liderança Cristã"
        />
      </FormField>

      <FormField
        label="Slug"
        hint="Usado na URL pública do curso. Gerado automaticamente a partir do título."
        error={errors.slug}
        required
      >
        <Input
          value={slug}
          onChange={(e) => setSlug(slugify(e.target.value))}
        />
      </FormField>

      <FormField
        label="Capa do curso"
        hint="Imagem exibida no catálogo e nos cards. JPEG, PNG ou WebP, até 5 MB."
        error={coverUploadError ?? undefined}
      >
        <div className="flex items-center gap-4">
          <div className="relative flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-(--radius) border border-(--border) bg-(--surface-alt)">
            {coverPreview ? (
              <img
                src={coverPreview}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <ImagePlus
                className="h-6 w-6 text-(--fg-subtle)"
                aria-hidden="true"
              />
            )}
            {coverUploadStatus === "uploading" && (
              <div className="absolute inset-0 flex items-center justify-center bg-(--surface)/80">
                <Loader2
                  className="h-5 w-5 animate-spin text-(--fg-muted)"
                  aria-hidden="true"
                />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={coverUploadStatus === "uploading"}
            >
              {coverPreview ? "Trocar imagem" : "Selecionar imagem"}
            </Button>
            {coverPreview && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<X className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={removeCover}
                disabled={coverUploadStatus === "uploading"}
              >
                Remover
              </Button>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleCoverChange}
            className="sr-only"
            aria-label="Selecionar imagem de capa"
          />
        </div>
      </FormField>

      <FormField label="Categoria" error={errors.category} required>
        <Select
          value={categorySelectValue}
          onValueChange={setCategorySelectValue}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
            <SelectItem value={OTHER_CATEGORY}>Outra categoria…</SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {categorySelectValue === OTHER_CATEGORY && (
        <FormField label="Nova categoria" required>
          <Input
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
            placeholder="Ex.: Teologia Pastoral"
          />
        </FormField>
      )}

      <FormField label="Instrutor" error={errors.instructorId} required>
        <Select value={instructorId} onValueChange={setInstructorId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um instrutor" />
          </SelectTrigger>
          <SelectContent>
            {instructors.map((instructor) => (
              <SelectItem key={instructor.id} value={instructor.id}>
                {instructor.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label="Série"
        hint="Coleção temática à qual este curso pertence, se houver."
      >
        <Select value={seriesSelectValue} onValueChange={setSeriesSelectValue}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma série" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SERIES}>Sem série</SelectItem>
            {series.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField
        label="Descrição"
        hint="Explique o objetivo do curso e para quem ele é indicado."
        error={errors.description}
        required
      >
        <RichTextEditor value={description} onChange={setDescription} />
      </FormField>

      <Button
        type="submit"
        disabled={isLoading || coverUploadStatus === "uploading"}
        loading={isLoading}
      >
        {mode === "edit" ? "Salvar alterações" : "Criar curso"}
      </Button>
    </form>
  );
}

// ─── CourseModuleForm ───────────────────────────────────────────────────────
// Sem arquivo próprio na lista de arquivos permitidos de P-6.4 — módulo é
// sub-entidade de curso, então o formulário fica junto de `course-form.tsx`
// (decisão registrada em SESSIONS.md).

export interface CourseModuleFormValues {
  title: string;
  description: string | null;
  order: number;
}

export interface CourseModuleFormProps {
  courseId: string;
  courseModule?: CourseModule;
  /** Próxima posição sugerida quando `courseModule` não é informado (criação). */
  nextOrder?: number;
  onSubmit: (values: CourseModuleFormValues) => void;
  isLoading?: boolean;
  className?: string;
}

/** Criar/editar módulo de um curso (título, ordem). */
export function CourseModuleForm({
  courseId,
  courseModule,
  nextOrder = 0,
  onSubmit,
  isLoading = false,
  className,
}: CourseModuleFormProps) {
  const [title, setTitle] = React.useState(courseModule?.title ?? "");
  const [description, setDescription] = React.useState(
    courseModule?.description ?? "",
  );
  const [order, setOrder] = React.useState(courseModule?.order ?? nextOrder);
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = createCourseModuleSchema.safeParse({
      courseId,
      title,
      description: description.trim() || null,
      order,
    });

    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }

    setErrors({});
    onSubmit({
      title: result.data.title,
      description: result.data.description,
      order: result.data.order,
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-4", className)}
    >
      <FormField label="Título do módulo" error={errors.title} required>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ex.: Bases bíblicas da liderança"
        />
      </FormField>

      <FormField label="Descrição" error={errors.description}>
        <textarea
          value={description ?? ""}
          onChange={(e) => setDescription(e.target.value)}
          rows={2}
          className="w-full resize-none rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) outline-none transition-colors placeholder:text-(--fg-muted) focus:border-(--brand)"
          placeholder="Opcional"
        />
      </FormField>

      <FormField label="Ordem" error={errors.order} required>
        <Input
          type="number"
          min={0}
          value={order}
          onChange={(e) => setOrder(Number(e.target.value))}
          className="max-w-32"
        />
      </FormField>

      <Button type="submit" disabled={isLoading} loading={isLoading}>
        {courseModule ? "Salvar módulo" : "Adicionar módulo"}
      </Button>
    </form>
  );
}
