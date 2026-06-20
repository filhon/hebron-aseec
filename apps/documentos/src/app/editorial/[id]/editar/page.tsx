import { notFound } from "next/navigation";
import { and, eq, isNull } from "drizzle-orm";
import { db } from "@hebron/db/client";
import { documents, editals } from "@hebron/db/schema";
import { EditDocumentClient } from "./_client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EditarDocumentoPage({ params }: PageProps) {
  const { id } = await params;

  const [row] = await db
    .select({
      id: documents.id,
      title: documents.title,
      contentMd: documents.contentMd,
      fileUrl: documents.fileUrl,
      visibility: documents.visibility,
      categoryId: documents.categoryId,
      isEdital: editals.id,
      editalOpensAt: editals.opensAt,
      editalClosesAt: editals.closesAt,
    })
    .from(documents)
    .leftJoin(editals, eq(editals.id, documents.id))
    .where(and(eq(documents.id, id), isNull(documents.deletedAt)))
    .limit(1);

  if (!row) notFound();

  return (
    <EditDocumentClient
      doc={{
        id: row.id,
        title: row.title,
        contentMd: row.contentMd,
        fileUrl: row.fileUrl,
        visibility: row.visibility as "public" | "internal" | "restricted",
        categoryId: row.categoryId,
        isEdital: row.isEdital !== null,
        editalOpensAt: row.editalOpensAt ?? null,
        editalClosesAt: row.editalClosesAt ?? null,
      }}
    />
  );
}
