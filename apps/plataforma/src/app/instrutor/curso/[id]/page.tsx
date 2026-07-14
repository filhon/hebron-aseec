import { EmptyState, Button } from "@hebron/ui";
import { BookOpen } from "lucide-react";
import { CourseEditorView } from "../../../../components/course-editor-view";
import {
  requireInstrutorSession,
  getCourseForEditor,
} from "../../../../lib/queries";

export default async function EditorCursoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireInstrutorSession();

  const data = await getCourseForEditor(session.actorId, id);

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <EmptyState
          icon={BookOpen}
          title="Curso não encontrado"
          description="Este curso não existe ou foi removido."
          action={
            <Button asChild variant="outline">
              <a href="/instrutor">Voltar ao painel</a>
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
