import TarefasShell from "./shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <TarefasShell>{children}</TarefasShell>;
}
