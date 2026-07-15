import HospedeShell from "./shell";

export default function HospedeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <HospedeShell>{children}</HospedeShell>;
}
