import { Suspense } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { EmptyState, Button, ErrorState } from "@hebron/ui";
import { GraduationCap } from "lucide-react";
import { CourseDetailView } from "../../../../components/course-detail-view";
import {
  requireAlunoSession,
  getCourseBySlug,
  getCourseModulesWithLessons,
  getEnrollment,
  getUserProgressForCourse,
} from "../../../../lib/queries";

function Bone({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded bg-(--surface-alt) ${className}`} />
  );
}

// CourseDetailView já embute o PageHeader (título/breadcrumb dependem do
// curso) — não está na lista de arquivos permitidos deste prompt para ganhar
// um header estático fora da fronteira, então o esqueleto imita a página
// inteira (P-6.5b, item 1).
function CourseDetailSkeleton() {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      className="mx-auto max-w-6xl px-6 py-8"
    >
      <Bone className="mb-3 h-2.5 w-24" />
      <Bone className="mb-2 h-3 w-56" />
      <Bone className="mb-3 h-7 w-2/3" />
      <Bone className="mb-1.5 h-4 w-full" />
      <Bone className="mb-8 h-4 w-3/4" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <Bone className="h-28 w-full rounded-md" />
          <Bone className="h-24 w-full rounded-md" />
        </div>
        <Bone className="h-72 w-full rounded-md" />
      </div>
    </div>
  );
}

async function CursoDetalheContent({ slug }: { slug: string }) {
  const session = await requireAlunoSession();

  let detail: Awaited<ReturnType<typeof getCourseBySlug>>;
  try {
    detail = await getCourseBySlug(session.actorId, slug);
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

  if (!detail) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <EmptyState
          icon={GraduationCap}
          title="Curso não encontrado"
          description="O curso que você procura não existe ou foi removido."
          action={
            <Button asChild variant="outline">
              <Link href="/">Voltar ao catálogo</Link>
            </Button>
          }
          hideQuote
        />
      </div>
    );
  }

  if (!detail.course.isPublished) redirect("/");

  let modules: Awaited<
    ReturnType<typeof getCourseModulesWithLessons>
  >["modules"];
  let lessons: Awaited<
    ReturnType<typeof getCourseModulesWithLessons>
  >["lessons"];
  let enrollment: Awaited<ReturnType<typeof getEnrollment>>;
  let progress: Awaited<ReturnType<typeof getUserProgressForCourse>>;
  try {
    ({ modules, lessons } = await getCourseModulesWithLessons(
      session.actorId,
      detail.course.id,
    ));
    enrollment = await getEnrollment(session.actorId, detail.course.id);
    progress = enrollment
      ? await getUserProgressForCourse(session.actorId, detail.course.id)
      : [];
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

export default async function CursoDetalhePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <Suspense fallback={<CourseDetailSkeleton />}>
      <CursoDetalheContent slug={slug} />
    </Suspense>
  );
}
