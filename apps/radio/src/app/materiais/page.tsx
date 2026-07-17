import type { Metadata } from "next";
import { Lock } from "lucide-react";
import { Button, PageHeader } from "@hebron/ui";
import { CANONICAL_LOGIN_URL } from "@hebron/auth";
import { MaterialsPanel } from "../../components/materials-panel";
import {
  getAuthUser,
  getExclusiveMaterialsList,
  hasAcceptedTerm,
} from "../../lib/queries";

export const metadata: Metadata = {
  title: "Materiais exclusivos",
  description: "Apostilas e roteiros de apoio às séries da rádio.",
};

export default async function MateriaisPage() {
  const user = await getAuthUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <PageHeader
          title="Materiais exclusivos"
          description="Apostilas e roteiros de apoio às séries da rádio."
        />

        <div className="flex flex-col items-center gap-5 rounded-(--radius-md) border border-(--border) bg-(--surface-alt) py-16 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-(--border) bg-(--surface)">
            <Lock className="h-6 w-6 text-(--brand)" aria-hidden="true" />
          </div>
          <div className="max-w-sm space-y-1.5">
            <h2 className="font-(--font-display) text-lg font-(--font-weight-semibold) text-(--fg)">
              Entre para acessar os materiais
            </h2>
            <p className="text-sm text-(--fg-muted)">
              Os materiais exclusivos são liberados para usuários cadastrados,
              mediante aceite do termo de uso.
            </p>
          </div>
          <Button asChild>
            <a href={CANONICAL_LOGIN_URL}>Entrar</a>
          </Button>
        </div>
      </div>
    );
  }

  const accepted = await hasAcceptedTerm(user.id);
  const materials = accepted ? await getExclusiveMaterialsList(user.id) : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <PageHeader
        title="Materiais exclusivos"
        description="Apostilas e roteiros de apoio às séries da rádio."
      />

      <MaterialsPanel initialAccepted={accepted} materials={materials} />
    </div>
  );
}
