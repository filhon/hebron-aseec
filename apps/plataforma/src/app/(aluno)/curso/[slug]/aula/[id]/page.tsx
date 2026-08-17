import { Suspense } from "react";
import Link from "next/link";
import { EmptyState, Button, ErrorState } from "@hebron/ui";
import { GraduationCap } from "lucide-react";
import { LessonView } from "../../../../../../components/lesson-view";
import {
  PlayerSkeleton,
  CourseSidebarSkeleton,
} from "../../../../../../components/player-skeleton";
import {
  requireAlunoSession,
  getLessonPageData,
} from "../../../../../../lib/queries";

function Bone({ className }: { className: string }) {
  return (
    <div className={`animate-pulse rounded bg-(--surface-alt) ${className}`} />
  );
}

// LessonView já embute o PageHeader (breadcrumb/título dependem da aula) —
// não está na lista de arquivos permitidos deste prompt para ganhar um
// header estático fora da fronteira, então o esqueleto imita a página
// inteira, com os dois esqueletos órfãos de S-107 (P-6.5b, itens 1-2).
function AulaSkeleton() {
  return (
    <div
      aria-hidden="true"
      role="presentation"
      className="mx-auto max-w-6xl px-6 py-8"
    >
      <Bone className="mb-2 h-3 w-72" />
      <Bone className="mb-8 h-7 w-1/2" />

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <PlayerSkeleton />
          <Bone className="h-20 w-full rounded-md" />
        </div>

        <aside className="h-fit rounded-md border border-(--border) bg-(--surface) p-4">
          <Bone className="mb-3 ml-1 h-3.5 w-32" />
          <CourseSidebarSkeleton />
        </aside>
      </div>
    </div>
  );
}

async function AulaContent({ slug, id }: { slug: string; id: string }) {
  const session = await requireAlunoSession();

  let data: Awaited<ReturnType<typeof getLessonPageData>>;
  try {
    data = await getLessonPageData(session.actorId, slug, id);
  } catch {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <ErrorState
          title="Não foi possível carregar esta aula"
          description="Verifique sua conexão e tente novamente."
        />
      </div>
    );
  }

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

export default async function AulaPage({
  params,
}: {
  params: Promise<{ slug: string; id: string }>;
}) {
  const { slug, id } = await params;

  return (
    <Suspense fallback={<AulaSkeleton />}>
      <AulaContent slug={slug} id={id} />
    </Suspense>
  );
}
