import { Suspense } from "react";
import { Users, RotateCcw } from "lucide-react";
import { PageHeader, EmptyState, ErrorState, Button } from "@hebron/ui";
import { UserTable } from "../../../components/user-table";
import { UserTableSkeleton } from "../../../components/user-table-skeleton";
import { mockUsers, mockRoleAssignments } from "../../../lib/mock-data";

// ─── Fade-in keyframe ─────────────────────────────────────────────────────────

const fadeInStyle = `@keyframes hb-fade-in { from { opacity: 0; } to { opacity: 1; } }`;

// ─── Users content (async — ready for real data fetching) ─────────────────────

async function UsersContent() {
  const users = mockUsers;
  const roleAssignments = mockRoleAssignments;

  if (users.length === 0) {
    return (
      <EmptyState
        title="Nenhum usuário cadastrado ainda."
        icon={Users}
        quote={{
          text: "A colheita é grande, mas os obreiros são poucos",
          reference: "Mateus 9:37",
        }}
      />
    );
  }

  return (
    <div style={{ animation: "hb-fade-in 0.2s ease-out" }}>
      <UserTable users={users} roleAssignments={roleAssignments} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function UsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const { state } = await searchParams;

  return (
    <>
      <style>{fadeInStyle}</style>
      <div
        style={{
          padding: "1.5rem",
          maxWidth: "72rem",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
        }}
      >
        <PageHeader
          title="Usuários"
          description={`${mockUsers.length} usuários cadastrados no sistema`}
        />

        {state === "error" ? (
          <ErrorState
            title="Não foi possível carregar os usuários"
            description="Verifique sua conexão e tente novamente."
            action={
              <form method="get">
                <Button
                  type="submit"
                  leftIcon={<RotateCcw size={14} aria-hidden="true" />}
                >
                  Tentar novamente
                </Button>
              </form>
            }
          />
        ) : (
          <Suspense fallback={<UserTableSkeleton />}>
            <UsersContent />
          </Suspense>
        )}
      </div>
    </>
  );
}
