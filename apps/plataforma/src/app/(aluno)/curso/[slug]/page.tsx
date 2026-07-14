import { redirect } from "next/navigation";
import { EmptyState, Button } from "@hebron/ui";
import { GraduationCap } from "lucide-react";
import { CourseDetailView } from "../../../../components/course-detail-view";
import {
  requireAlunoSession,
  getCourseBySlug,
  getCourseModulesWithLessons,
  getEnrollment,
  getUserProgressForCourse,
} from "../../../../lib/queries";

export default async function CursoDetalhePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const session = await requireAlunoSession();

  const detail = await getCourseBySlug(session.actorId, slug);
  if (!detail) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <EmptyState
          icon={GraduationCap}
          title="Curso não encontrado"
          description="O curso que você procura não existe ou foi removido."
          action={
            <Button asChild variant="outline">
              <a href="/">Voltar ao catálogo</a>
            </Button>
          }
          hideQuote
        />
      </div>
    );
  }

  if (!detail.course.isPublished) redirect("/");

  const { modules, lessons } = await getCourseModulesWithLessons(
    session.actorId,
    detail.course.id,
  );
  const enrollment = await getEnrollment(session.actorId, detail.course.id);
  const progress = enrollment
    ? await getUserProgressForCourse(session.actorId, detail.course.id)
    : [];

  return (
    <CourseDetailView
      course={detail.course}
      instructorBio={detail.instructorBio}
      modules={modules}
      lessons={lessons}
      enrollment={enrollment}
      progress={progress}
    />
  );
}
