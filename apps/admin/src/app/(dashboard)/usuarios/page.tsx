import { Suspense } from "react";
import { Users, AlertTriangle, RotateCcw } from "lucide-react";
import { UserTable } from "../../../components/user-table";
import { UserTableSkeleton } from "../../../components/user-table-skeleton";
import { mockUsers, mockRoleAssignments } from "../../../lib/mock-data";

// ─── Fade-in keyframe ─────────────────────────────────────────────────────────

const fadeInStyle = `@keyframes hb-fade-in { from { opacity: 0; } to { opacity: 1; } }`;

// ─── Error state ──────────────────────────────────────────────────────────────

function UsersError() {
  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1rem",
        padding: "5rem 1.5rem",
        textAlign: "center",
        animation: "hb-fade-in 0.2s ease-out",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: "3rem",
          height: "3rem",
          borderRadius: "var(--radius-full)",
          backgroundColor: "var(--color-destructive-muted)",
          color: "var(--color-destructive)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <AlertTriangle size={20} />
      </div>
      <div>
        <p
          style={{
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-semibold)",
            color: "var(--color-foreground)",
          }}
        >
          Não foi possível carregar os usuários
        </p>
        <p
          style={{
            fontSize: "var(--text-xs)",
            color: "var(--color-muted-foreground)",
            marginTop: "0.25rem",
          }}
        >
          Verifique sua conexão e tente novamente.
        </p>
      </div>
      {/* GET form — clears query params and reloads, no JS required */}
      <form method="get">
        <button
          type="submit"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.375rem",
            padding: "0.5rem 1rem",
            fontSize: "var(--text-sm)",
            fontWeight: "var(--font-weight-medium)",
            color: "var(--color-primary-foreground)",
            backgroundColor: "var(--color-primary)",
            border: "none",
            borderRadius: "var(--radius)",
            cursor: "pointer",
          }}
        >
          <RotateCcw size={14} aria-hidden="true" />
          Tentar novamente
        </button>
      </form>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function UsersEmpty() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.75rem",
        padding: "5rem 1.5rem",
        textAlign: "center",
        animation: "hb-fade-in 0.2s ease-out",
      }}
    >
      <div
        aria-hidden="true"
        style={{
          width: "3rem",
          height: "3rem",
          borderRadius: "var(--radius-full)",
          backgroundColor: "var(--color-primary-muted)",
          color: "var(--color-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Users size={20} />
      </div>
      <p
        style={{
          fontSize: "var(--text-sm)",
          fontWeight: "var(--font-weight-medium)",
          color: "var(--color-foreground)",
        }}
      >
        Nenhum usuário cadastrado ainda.
      </p>
      <p
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-muted-foreground)",
          fontStyle: "italic",
          maxWidth: "24rem",
        }}
      >
        "A colheita é grande, mas os obreiros são poucos"
        <br />— Mateus 9:37
      </p>
    </div>
  );
}

// ─── Users content (async — ready for real data fetching) ─────────────────────

async function UsersContent() {
  const users = mockUsers;
  const roleAssignments = mockRoleAssignments;

  if (users.length === 0) {
    return <UsersEmpty />;
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
        {/* Header */}
        <div>
          <h1
            style={{
              fontSize: "var(--text-2xl)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--color-foreground)",
            }}
          >
            Usuários
          </h1>
          <p
            style={{
              fontSize: "var(--text-sm)",
              color: "var(--color-muted-foreground)",
              marginTop: "0.25rem",
            }}
          >
            {mockUsers.length} usuários cadastrados no sistema
          </p>
        </div>

        {/* Content — skeleton while loading, error state on failure */}
        {state === "error" ? (
          <UsersError />
        ) : (
          <Suspense fallback={<UserTableSkeleton />}>
            <UsersContent />
          </Suspense>
        )}
      </div>
    </>
  );
}
