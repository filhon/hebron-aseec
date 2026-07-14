import Link from "next/link";
import { EmptyState, Button } from "@hebron/ui";
import { BookOpen } from "lucide-react";
import { LessonEditorView } from "../../../../../../components/lesson-editor-view";
import {
  requireInstrutorSession,
  getLessonForEditor,
} from "../../../../../../lib/queries";

export default async function EditorAulaPage({
  params,
}: {
  params: Promise<{ id: string; aulaId: string }>;
}) {
  const { id, aulaId } = await params;
  const session = await requireInstrutorSession();

  const data = await getLessonForEditor(session.actorId, id, aulaId);

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <EmptyState
          icon={BookOpen}
          title="Aula não encontrada"
          description="Esta aula não existe ou foi removida."
          action={
            <Button asChild variant="outline">
              <a href={`/instrutor/curso/${id}`}>Voltar ao editor do curso</a>
            </Button>
          }
          hideQuote
        />
      </div>
    );
  }

  if (data.lesson.type === "quiz") {
    const quizHref = data.lesson.quizId
      ? `/instrutor/curso/${id}/quiz/${data.lesson.quizId}`
      : `/instrutor/curso/${id}/quiz/novo?lessonId=${data.lesson.id}`;

    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <EmptyState
          icon={BookOpen}
          title="Esta aula é um quiz"
          description="Perguntas e nota de aprovação são editadas na tela de quiz."
          action={
            <Button asChild>
              <Link href={quizHref}>Ir para o editor de quiz</Link>
            </Button>
          }
          hideQuote
        />
      </div>
    );
  }

  return <LessonEditorView course={data.course} lesson={data.lesson} />;
}
