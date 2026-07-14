import { NewCourseView } from "../../../../components/new-course-view";
import {
  requireInstrutorSession,
  getInstructors,
  getSeriesList,
  getCourseCategories,
} from "../../../../lib/queries";

export default async function NovoCursoPage() {
  const session = await requireInstrutorSession();

  const [instructors, series, categories] = await Promise.all([
    getInstructors(session.actorId),
    getSeriesList(session.actorId),
    getCourseCategories(session.actorId),
  ]);

  return (
    <NewCourseView
      instructors={instructors}
      series={series}
      categories={categories}
    />
  );
}
