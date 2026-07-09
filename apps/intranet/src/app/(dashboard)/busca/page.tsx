import { PageHeader } from "@hebron/ui";
import { SearchGlobal } from "../../../components/search-global";

export default function BuscaPage() {
  return (
    <div className="hb-page">
      <PageHeader
        title="Busca"
        description="Encontre projetos, documentos, tarefas e reuniões em todos os módulos da intranet."
      />
      <SearchGlobal />
    </div>
  );
}
