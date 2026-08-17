"use client";

import * as React from "react";
import {
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
import { CourseCard } from "./course-card";

const ALL_CATEGORIES = "__todas__";
const ALL_INSTRUCTORS = "__todos__";
const ALL_SERIES = "__todas_series__";

const CATALOG_QUOTE = {
  text: "Instrui o menino no caminho em que deve andar, e ainda quando for velho não se desviará dele.",
  reference: "Provérbios 22:6",
};

export interface CourseCatalogProps {
  /** Cursos publicados, já resolvidos no servidor (P-6.5b). */
  courses: Course[];
}

/** Filtros (busca, categoria, instrutor, série) sobre os cursos publicados já
 * renderizados no servidor — mantém o comportamento de filtro entregue em
 * P-6.3b, agora sem a ida extra ao cliente que `searchCourses` fazia via
 * `useEffect` (P-6.5b, item 4). */
export function CourseCatalog({ courses }: CourseCatalogProps) {
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState(ALL_CATEGORIES);
  const [instructor, setInstructor] = React.useState(ALL_INSTRUCTORS);
  const [seriesFilter, setSeriesFilter] = React.useState(ALL_SERIES);

  const categories = React.useMemo(
    () => Array.from(new Set(courses.map((c) => c.category))).sort(),
    [courses],
  );

  const instructors = React.useMemo(
    () =>
      Array.from(
        new Map(courses.map((c) => [c.instructorId, c.instructorName])),
      ),
    [courses],
  );

  const seriesOptions = React.useMemo(
    () =>
      Array.from(
        new Map(
          courses
            .filter((c) => c.seriesId !== null && c.seriesName !== null)
            .map((c) => [c.seriesId as string, c.seriesName as string]),
        ),
      ),
    [courses],
  );

  const filteredCourses = courses.filter((course) => {
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

  if (courses.length === 0) {
    return (
      <EmptyState
        icon={GraduationCap}
        title="Nenhum curso disponível ainda"
        description="Novas trilhas de formação serão publicadas em breve."
        quote={CATALOG_QUOTE}
      />
    );
  }

  return (
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
          <SelectTrigger className="sm:w-48" aria-label="Filtrar por categoria">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES}>Todas as categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={instructor} onValueChange={setInstructor}>
          <SelectTrigger className="sm:w-56" aria-label="Filtrar por instrutor">
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
          quote={CATALOG_QUOTE}
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
  );
}
