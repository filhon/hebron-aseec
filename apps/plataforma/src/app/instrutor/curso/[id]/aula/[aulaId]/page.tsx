"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  PageHeader,
  EmptyState,
  Button,
  FormField,
  Input,
  RichTextEditor,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@hebron/ui";
import { BookOpen, CheckCircle2 } from "lucide-react";
import type { LessonType } from "@hebron/types/plataforma";
import { mockCourses, mockLessons } from "../../../../../../lib/mock-data";

const TYPE_LABEL: Record<Exclude<LessonType, "quiz">, string> = {
  video: "Vídeo",
  text: "Texto",
  download: "Material para download",
};

export default function EditorAulaPage() {
  const { id, aulaId } = useParams<{ id: string; aulaId: string }>();
  const router = useRouter();

  const course = mockCourses.find((c) => c.id === id);
  const lesson = course
    ? mockLessons.find((l) => l.id === aulaId && l.courseId === course.id)
    : undefined;

  const [title, setTitle] = React.useState(lesson?.title ?? "");
  const [type, setType] = React.useState<Exclude<LessonType, "quiz">>(
    lesson && lesson.type !== "quiz" ? lesson.type : "video",
  );
  const [videoUrl, setVideoUrl] = React.useState(lesson?.videoUrl ?? "");
  const [videoDuration, setVideoDuration] = React.useState(
    lesson?.videoDurationSeconds ? String(lesson.videoDurationSeconds) : "",
  );
  const [textContent, setTextContent] = React.useState(
    lesson?.textContent ?? "",
  );
  const [downloadFileName, setDownloadFileName] = React.useState(
    lesson?.downloadFileName ?? "",
  );
  const [downloadUrl, setDownloadUrl] = React.useState(
    lesson?.downloadUrl ?? "",
  );
  const [requiresCompletion, setRequiresCompletion] = React.useState(
    lesson?.requiresCompletion ?? true,
  );
  const [saved, setSaved] = React.useState(false);

  if (!course || !lesson) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <EmptyState
          icon={BookOpen}
          title="Aula não encontrada"
          description="Esta aula não existe ou foi removida."
          action={
            <Button
              variant="outline"
              onClick={() => router.push(`/instrutor/curso/${id}`)}
            >
              Voltar ao editor do curso
            </Button>
          }
          hideQuote
        />
      </div>
    );
  }

  if (lesson.type === "quiz") {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <EmptyState
          icon={BookOpen}
          title="Esta aula é um quiz"
          description="Perguntas e nota de aprovação são editadas na tela de quiz."
          action={
            <Button asChild>
              <Link
                href={`/instrutor/curso/${course.id}/quiz/${lesson.quizId}`}
              >
                Ir para o editor de quiz
              </Link>
            </Button>
          }
          hideQuote
        />
      </div>
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaved(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <PageHeader
        breadcrumb={[
          { label: "Painel", href: "/instrutor" },
          { label: course.title, href: `/instrutor/curso/${course.id}` },
          { label: lesson.title },
        ]}
        title="Editar aula"
      />

      {saved && (
        <div className="mb-6 flex items-center gap-2.5 rounded-(--radius) border border-(--hb-green-deep) bg-(--color-success-muted) px-4 py-3 text-sm text-(--hb-green-fg)">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Alterações salvas nesta sessão (sem persistência — Bloco B conecta ao
          banco).
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Título" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </FormField>

        <FormField label="Tipo de aula" required>
          <Select
            value={type}
            onValueChange={(v) => setType(v as Exclude<LessonType, "quiz">)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(TYPE_LABEL) as Array<keyof typeof TYPE_LABEL>).map(
                (key) => (
                  <SelectItem key={key} value={key}>
                    {TYPE_LABEL[key]}
                  </SelectItem>
                ),
              )}
            </SelectContent>
          </Select>
        </FormField>

        {type === "video" && (
          <>
            <FormField label="URL do vídeo" required>
              <Input
                value={videoUrl ?? ""}
                onChange={(e) => setVideoUrl(e.target.value)}
                placeholder="https://video.hebronaseec.com.br/…"
              />
            </FormField>
            <FormField label="Duração (segundos)">
              <Input
                type="number"
                min={0}
                value={videoDuration}
                onChange={(e) => setVideoDuration(e.target.value)}
              />
            </FormField>
          </>
        )}

        {type === "text" && (
          <FormField label="Conteúdo" required>
            <RichTextEditor
              value={textContent ?? ""}
              onChange={setTextContent}
            />
          </FormField>
        )}

        {type === "download" && (
          <>
            <FormField label="Nome do arquivo" required>
              <Input
                value={downloadFileName ?? ""}
                onChange={(e) => setDownloadFileName(e.target.value)}
                placeholder="material.pdf"
              />
            </FormField>
            <FormField label="URL do arquivo" required>
              <Input
                value={downloadUrl ?? ""}
                onChange={(e) => setDownloadUrl(e.target.value)}
                placeholder="https://docs.hebronaseec.com.br/…"
              />
            </FormField>
          </>
        )}

        <label className="flex items-center gap-2.5 text-sm text-(--fg)">
          <input
            type="checkbox"
            checked={requiresCompletion}
            onChange={(e) => setRequiresCompletion(e.target.checked)}
            className="h-4 w-4 accent-(--hb-blue)"
          />
          Só desbloqueia após concluir a aula anterior
        </label>

        <div className="flex gap-3">
          <Button type="submit">Salvar alterações</Button>
          <Button asChild variant="ghost">
            <Link href={`/instrutor/curso/${course.id}`}>Voltar ao curso</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
