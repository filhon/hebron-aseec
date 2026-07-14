"use client";

import * as React from "react";
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
import { CourseCard } from "../../components/course-card";
import { CourseCardSkeleton } from "../../components/course-card-skeleton";
import {
  mockCourses,
  mockEnrollments,
  mockLessons,
  mockProgress,
} from "../../lib/mock-data";

const LOADING_DELAY_MS = 500;

const CURRENT_USER_ID = "user-aluno-01";
const ALL_CATEGORIES = "__todas__";
const ALL_INSTRUCTORS = "__todos__";

function courseProgressPercent(courseId: string): number | undefined {
  const enrolled = mockEnrollments.some(
    (e) => e.userId === CURRENT_USER_ID && e.courseId === courseId,
  );
  if (!enrolled) return undefined;

  const totalLessons = mockLessons.filter(
    (l) => l.courseId === courseId,
  ).length;
  if (totalLessons === 0) return 0;

  const completedLessons = mockProgress.filter(
    (p) =>
      p.userId === CURRENT_USER_ID && p.courseId === courseId && p.completedAt,
  ).length;

  return Math.round((completedLessons / totalLessons) * 100);
}

export default function CatalogoPage() {
  const [loading, setLoading] = React.useState(true);
  const [search, setSearch] = React.useState("");
  const [category, setCategory] = React.useState(ALL_CATEGORIES);
  const [instructor, setInstructor] = React.useState(ALL_INSTRUCTORS);

  React.useEffect(() => {
    const timer = setTimeout(() => setLoading(false), LOADING_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  const publishedCourses = React.useMemo(
    () => mockCourses.filter((c) => c.isPublished),
    [],
  );

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

  const filteredCourses = publishedCourses.filter((course) => {
    const matchesSearch = course.title
      .toLowerCase()
      .includes(search.trim().toLowerCase());
    const matchesCategory =
      category === ALL_CATEGORIES || course.category === category;
    const matchesInstructor =
      instructor === ALL_INSTRUCTORS || course.instructorId === instructor;
    return matchesSearch && matchesCategory && matchesInstructor;
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
              placeholder="Buscar por título…"
              leftAdornment={<Search className="h-4 w-4" aria-hidden="true" />}
              className="sm:max-w-xs"
              aria-label="Buscar curso por título"
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
                  progressPercent={courseProgressPercent(course.id)}
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
