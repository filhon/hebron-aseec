import AdminShell from "./shell";

// Mock local — sem integração de sessão nesta fase (Bloco A). O gate
// server-side de papel (super_admin) é aplicado em P-8.9 (G5).
const MOCK_USER = {
  name: "Filipe Honório",
  email: "filipe@hebronaseec.com.br",
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <AdminShell user={MOCK_USER}>{children}</AdminShell>;
}
