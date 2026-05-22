import { UserTable } from "../../../components/user-table";
import { mockUsers, mockRoleAssignments } from "../../../lib/mock-data";

export default function UsuariosPage() {
  return (
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

      <UserTable users={mockUsers} roleAssignments={mockRoleAssignments} />
    </div>
  );
}
