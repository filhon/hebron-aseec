import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { meetingSessions } from "@hebron/db/schema";
import { getDirectors } from "../../../../../lib/queries";
import { EditarReuniaoClient } from "./editar-reuniao-client";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarReuniaoPage({ params }: Props) {
  const { id } = await params;

  const [meetingRows, directors] = await Promise.all([
    db.select().from(meetingSessions).where(eq(meetingSessions.id, id)),
    getDirectors(),
  ]);

  const meeting = meetingRows[0];
  if (!meeting) notFound();

  return (
    <EditarReuniaoClient
      meetingId={meeting.id}
      meeting={{
        date: meeting.date,
        type: meeting.type,
        chairUserId: meeting.chairUserId,
        notes: meeting.notes,
      }}
      directors={directors}
    />
  );
}
