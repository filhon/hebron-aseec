"use client";

import * as React from "react";
import { useAction } from "next-safe-action/hooks";
import {
  PageHeader,
  EmptyState,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@hebron/ui";
import { Search, GraduationCap } from "lucide-react";
import type { Course } from "@hebron/types/plataforma";
import { CourseCard } from "../../components/course-card";
import { CourseCardSkeleton } from "../../components/course-card-skeleton";
import { searchCourses } from "../../actions/courses";

const ALL_CATEGORIES = "__todas__";
const ALL_INSTRUCTORS = "__todos__";
const ALL_SERIES = "__todas_series__";

export default function CatalogoPage() {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState(ALL_CATEGORIES);
  const [instructor, setInstructor] = React.useState(ALL_INSTRUCTORS);
  const [seriesFilter, setSeriesFilter] = React.useState(ALL_SERIES);

  const { execute, result, status } = useAction(searchCourses);

  React.useEffect(() => {
    execute({});
  }, [execute]);

  const loading = status === "executing" && result.data === undefined;

  // Busca por título/série já cobre searchCourses (PATCH-024); o filtro de
  // instrutor não existe na action (BRAIN §6.3 só pede título/série/categoria)
  // — mantido aqui por cima do resultado, como já era em Bloco A (S-105/S-108).
  const publishedCourses: Course[] = (result.data?.courses ?? [])
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

  const categories = React.useMemo(
    () => Array.from(new Set(publishedCourses.map((c) => c.category))).sort(),
    [publishedCourses],
  );

  const instructors = React.useMemo(
    () =>
      Array.from(
        new Map(
          publishedCourses.map((c) => [c.instructorId, c.instructorName]),
        ),
      ),
    [publishedCourses],
  );

  const seriesOptions = React.useMemo(
    () =>
      Array.from(
        new Map(
          publishedCourses
            .filter((c) => c.seriesId !== null && c.seriesName !== null)
            .map((c) => [c.seriesId as string, c.seriesName as string]),
        ),
      ),
    [publishedCourses],
  );

  const filteredCourses = publishedCourses.filter((course) => {
    const term = search.trim().toLowerCase();
    const matchesSearch =
      course.title.toLowerCase().includes(term) ||
      (course.seriesName?.toLowerCase().includes(term) ?? false);
    const matchesCategory =
      category === ALL_CATEGORIES || course.category === category;
    const matchesInstructor =
      instructor === ALL_INSTRUCTORS || course.instructorId === instructor;
    const matchesSeries =
      seriesFilter === ALL_SERIES || course.seriesId === seriesFilter;
    return (
      matchesSearch && matchesCategory && matchesInstructor && matchesSeries
    );
  });

  return (
    <div className="mx-auto max-w-6xl px-6 py-8">
      <PageHeader
        title="Catálogo de cursos"
        description="Trilhas de formação da Hebron Aseec — matricule-se e avance no seu ritmo."
      />

      {loading ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <CourseCardSkeleton key={i} />
          ))}
        </div>
      ) : publishedCourses.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="Nenhum curso disponível ainda"
          description="Novas trilhas de formação serão publicadas em breve."
          quote={{
            text: "Instrui o menino no caminho em que deve andar, e ainda quando for velho não se desviará dele.",
            reference: "Provérbios 22:6",
          }}
        />
      ) : (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por título ou série…"
              leftAdornment={<Search className="h-4 w-4" aria-hidden="true" />}
              className="sm:max-w-xs"
              aria-label="Buscar curso por título ou série"
            />

            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger
                className="sm:w-48"
                aria-label="Filtrar por categoria"
              >
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_CATEGORIES}>
                  Todas as categorias
                </SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={instructor} onValueChange={setInstructor}>
              <SelectTrigger
                className="sm:w-56"
                aria-label="Filtrar por instrutor"
              >
                <SelectValue placeholder="Instrutor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_INSTRUCTORS}>
                  Todos os instrutores
                </SelectItem>
                {instructors.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={seriesFilter} onValueChange={setSeriesFilter}>
              <SelectTrigger className="sm:w-56" aria-label="Filtrar por série">
                <SelectValue placeholder="Série" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_SERIES}>Todas as séries</SelectItem>
                {seriesOptions.map(([id, name]) => (
                  <SelectItem key={id} value={id}>
                    {name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {filteredCourses.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="Nenhum curso encontrado"
              description="Ajuste a busca ou os filtros para ver outros cursos."
              quote={{
                text: "Instrui o menino no caminho em que deve andar, e ainda quando for velho não se desviará dele.",
                reference: "Provérbios 22:6",
              }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {filteredCourses.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  href={`/curso/${course.slug}`}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
