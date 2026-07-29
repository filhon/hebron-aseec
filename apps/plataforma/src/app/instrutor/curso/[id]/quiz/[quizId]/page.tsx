import Link from "next/link";
import { EmptyState, Button } from "@hebron/ui";
import { HelpCircle } from "lucide-react";
import { QuizEditorView } from "../../../../../../components/quiz-editor-view";
import {
  requireInstrutorSession,
  getQuizEditorDataForLesson,
  getQuizEditorDataByQuizId,
} from "../../../../../../lib/queries";

export default async function EditorQuizPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; quizId: string }>;
  searchParams: Promise<{ lessonId?: string }>;
}) {
  const { id, quizId } = await params;
  const session = await requireInstrutorSession();

  const data =
    quizId === "novo"
      ? await (async () => {
          const { lessonId } = await searchParams;
          if (!lessonId) return null;
          return getQuizEditorDataForLesson(session.actorId, id, lessonId);
        })()
      : await getQuizEditorDataByQuizId(session.actorId, id, quizId);

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <EmptyState
          icon={HelpCircle}
          title="Quiz não encontrado"
          description="Este quiz não existe ou foi removido."
          action={
            <Button asChild variant="outline">
              <Link href={`/instrutor/curso/${id}`}>
                Voltar ao editor do curso
              </Link>
            </Button>
          }
          hideQuote
        />
      </div>
    );
  }

  return (
    <QuizEditorView
      course={data.course}
      lesson={data.lesson}
      quiz={data.quiz}
    />
  );
}
