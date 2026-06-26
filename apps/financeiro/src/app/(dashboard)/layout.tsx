import FinanceiroShell from "./shell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <FinanceiroShell>{children}</FinanceiroShell>;
}
