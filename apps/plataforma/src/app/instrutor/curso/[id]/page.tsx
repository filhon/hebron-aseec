import { Suspense } from "react";
import Link from "next/link";
import { EmptyState, Button, ErrorState } from "@hebron/ui";
import { BookOpen } from "lucide-react";
import { CourseEditorView } from "../../../../components/course-editor-view";
import {
  requireInstrutorSession,
  getCourseForEditor,
} from "../../../../lib/queries";

function Bone({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded bg-(--surface-alt) ${className}`} />
  );
}

// CourseEditorView já embute o PageHeader (título depende do curso) — não
// está na lista de arquivos permitidos deste prompt para ganhar um header
// estático fora da fronteira, então o esqueleto imita a página inteira
// (P-6.5b, item 1).
function CourseEditorSkeleton() {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      className="mx-auto max-w-4xl px-6 py-8"
    >
      <Bone className="mb-3 h-2.5 w-24" />
      <Bone className="mb-8 h-7 w-1/2" />

      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div
            key={i}
            className="rounded-md border border-(--border) bg-(--surface) p-4"
          >
            <Bone className="mb-3 h-4 w-40" />
            <div className="flex flex-col gap-2 pl-2">
              {Array.from({ length: 2 }).map((_, j) => (
                <Bone key={j} className="h-8 w-full rounded-sm" />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

async function CourseEditorContent({ id }: { id: string }) {
  const session = await requireInstrutorSession();

  let data: Awaited<ReturnType<typeof getCourseForEditor>>;
  try {
    data = await getCourseForEditor(session.actorId, id);
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <ErrorState
          title="Não foi possível carregar este curso"
          description="Verifique sua conexão e tente novamente."
        />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <EmptyState
          icon={BookOpen}
          title="Curso não encontrado"
          description="Este curso não existe ou foi removido."
          action={
            <Button asChild variant="outline">
              <Link href="/instrutor">Voltar ao painel</Link>
            </Button>
          }
          hideQuote
        />
      </div>
    );
  }

  return (
    <CourseEditorView
      course={data.course}
      modules={data.modules}
      lessons={data.lessons}
    />
  );
}

export default async function EditorCursoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <Suspense fallback={<CourseEditorSkeleton />}>
      <CourseEditorContent id={id} />
    </Suspense>
  );
}
