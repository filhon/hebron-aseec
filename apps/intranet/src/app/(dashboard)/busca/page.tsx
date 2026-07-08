import { PageHeader } from "@hebron/ui";
import {
  mockAnnouncements,
  mockCalendarEvents,
  mockDirectoryMembers,
  mockMeetingDecisions,
} from "../../../lib/mock-data";
import {
  SearchGlobal,
  type SearchResultItem,
} from "../../../components/search-global";

const searchItems: SearchResultItem[] = [
  ...mockAnnouncements.map((a) => ({
    id: `ann-${a.id}`,
    module: "Anúncios",
    title: a.title,
    description: a.authorName,
    href: "/anuncios",
  })),
  ...mockDirectoryMembers.map((m) => ({
    id: `dir-${m.id}`,
    module: "Diretório",
    title: m.name,
    description: m.role,
    href: "/diretorio",
  })),
  ...mockCalendarEvents.map((e) => ({
    id: `cal-${e.id}`,
    module: "Calendário",
    title: e.title,
    description: e.location ?? undefined,
    href: "/calendario",
  })),
  ...mockMeetingDecisions.map((d) => ({
    id: `dec-${d.id}`,
    module: "Reuniões",
    title: d.description,
    description: d.responsibleName,
    href: "/reunioes",
  })),
];

export default function BuscaPage() {
  return (
    <div className="hb-page">
      <PageHeader
        title="Busca"
        description="Encontre anúncios, pessoas, eventos e decisões em todos os módulos da intranet."
      />
      <SearchGlobal items={searchItems} />
    </div>
  );
}
