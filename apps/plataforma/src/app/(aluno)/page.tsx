import { Suspense } from "react";
import { PageHeader, ErrorState } from "@hebron/ui";
import type { Course } from "@hebron/types/plataforma";
import { CourseCatalog } from "../../components/course-catalog";
import { CourseCardSkeleton } from "../../components/course-card-skeleton";
import { searchCourses } from "../../actions/courses";

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
  const publishedCourses: Course[] = result.data.courses
    .filter((c) => c.published)
    .map((c) => ({
      id: c.id,
      title: c.title,
      slug: c.slug,
      description: c.description,
      coverImageUrl: c.coverUrl,
      category: c.category,
      instructorId: c.instructorId,
      instructorName: c.instructorName,
      seriesId: c.seriesId,
      seriesName: c.seriesName,
      isPublished: c.published,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    }));

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
