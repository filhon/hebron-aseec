import Link from "next/link";
import { EmptyState, Button } from "@hebron/ui";
import { GraduationCap } from "lucide-react";
import { LessonView } from "../../../../../../components/lesson-view";
import {
  requireAlunoSession,
  getLessonPageData,
} from "../../../../../../lib/queries";

export default async function AulaPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;
  const session = await requireAlunoSession();

  const data = await getLessonPageData(session.actorId, slug, id);

  if (!data) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <EmptyState
          icon={GraduationCap}
          title="Aula não encontrada"
          description="Esta aula não existe, foi removida ou ainda está bloqueada na sua trilha."
          action={
            <Button asChild variant="outline">
              <Link href={`/curso/${slug}`}>Voltar ao curso</Link>
            </Button>
          }
          hideQuote
        />
      </div>
    );
  }

  return (
    <LessonView
      course={data.course}
      modules={data.modules}
      lessons={data.lessons}
      lesson={data.lesson}
      progress={data.progress}
      quiz={data.quiz}
      lastAttempt={data.lastAttempt}
      posts={data.posts}
      notes={data.notes}
    />
  );
}
