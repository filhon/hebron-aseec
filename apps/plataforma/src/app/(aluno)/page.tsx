import { Suspense } from "react";
import { PageHeader, ErrorState } from "@hebron/ui";
import type { Course } from "@hebron/types/plataforma";
import { CourseCatalog } from "../../components/course-catalog";
import { CourseCardSkeleton } from "../../components/course-card-skeleton";
import { searchCourses } from "../../actions/courses";
import { resolveAssetUrl } from "../../lib/queries";

function CatalogSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <CourseCardSkeleton key={i} />
      ))}
    </div>
  );
}

async function CatalogContent() {
  // searchCourses (next-safe-action) chamada direto no servidor — sem passar
  // pelo hook useAction — devolve { data } | { serverError } sem lançar
  // (P-6.5b, item 4: catálogo deixa de depender de useEffect no cliente).
  const result = await searchCourses({});

  if (!result?.data) {
    return (
      <ErrorState
        title="Não foi possível carregar o catálogo"
        description="Verifique sua conexão e tente novamente."
      />
    );
  }

  // Busca por título/série já cobre searchCourses (PATCH-024); o filtro de
  // instrutor não existe na action (BRAIN §6.3 só pede título/série/categoria)
  // — mantido em CourseCatalog por cima do resultado, como já era em Bloco A
  // (S-105/S-108).
  //
  // c.coverUrl é o storage path cru (courses.cover_url, S-163) — nunca uma
  // URL renderizável. Resolvido aqui via resolveAssetUrl (mesma função de
  // getUserEnrollmentsWithProgress, lib/queries.ts) com TTL curto, só para a
  // entrega ao componente; o path cru continua sendo o que vive no banco
  // (P-6.18, fecha o débito de S-163/"P-9.1b-7b"). Linha legada (signed URL
  // de 10 anos gravada antes de S-163) não é um path do bucket — createSignedUrl
  // falha e resolveAssetUrl degrada para null, caindo no fallback de ícone de
  // CourseCard.
  const publishedCourses: Course[] = await Promise.all(
    result.data.courses
      .filter((c) => c.published)
      .map(async (c) => ({
        id: c.id,
        title: c.title,
        slug: c.slug,
        description: c.description,
        coverImageUrl: await resolveAssetUrl("plataforma-capas", c.coverUrl),
        category: c.category,
        instructorId: c.instructorId,
        instructorName: c.instructorName,
        seriesId: c.seriesId,
        seriesName: c.seriesName,
        isPublished: c.published,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
      })),
  );

  return <CourseCatalog courses={publishedCourses} />;
}

export default function CatalogoPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="Catálogo de cursos"
        description="Trilhas de formação da Hebron Aseec — matricule-se e avance no seu ritmo."
      />

      <Suspense fallback={<CatalogSkeleton />}>
        <CatalogContent />
      </Suspense>
    </div>
  );
}
