import { getDirectors } from "../../../../lib/queries";
import { NovaReuniaoClient } from "./nova-reuniao-client";

export default async function NovaReuniaoPage() {
  const directors = await getDirectors();

  return <NovaReuniaoClient directors={directors} />;
}
