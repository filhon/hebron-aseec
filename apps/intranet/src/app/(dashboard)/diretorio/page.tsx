"use client";

import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import {
  EmptyState,
  Input,
  PageHeader,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import { mockDirectoryMembers } from "../../../lib/mock-data";
import { DirectoryCard } from "../../../components/directory-card";

const ROLE_ALL = "all";

export default function DiretorioPage() {
  const [query, setQuery] = useState("");
  const [role, setRole] = useState(ROLE_ALL);

  const roles = useMemo(
    () => Array.from(new Set(mockDirectoryMembers.map((m) => m.role))).sort(),
    [],
  );

  const members = mockDirectoryMembers
    .filter((m) => role === ROLE_ALL || m.role === role)
    .filter((m) => {
      const term = query.trim().toLowerCase();
      if (!term) return true;
      return (
        m.name.toLowerCase().includes(term) ||
        m.email.toLowerCase().includes(term)
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));

  return (
    <div className="hb-page">
      <PageHeader
        title="Diretório"
        description="Diretoria, conselho, colaboradores, submissores e parceiros da Hebron Aseec."
      />

      <div className="hb-filter-row">
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar por nome ou e-mail…"
          leftAdornment={<Search className="h-4 w-4" aria-hidden="true" />}
          aria-label="Buscar no diretório"
          className="max-w-xs"
        />
        <Select value={role} onValueChange={setRole}>
          <SelectTrigger aria-label="Filtrar por papel" className="max-w-56">
            <SelectValue placeholder="Papel" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ROLE_ALL}>Todos os papéis</SelectItem>
            {roles.map((r) => (
              <SelectItem key={r} value={r}>
                {r}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {members.length === 0 ? (
        <EmptyState
          icon={Users}
          title="Nenhum membro encontrado"
          description="Ajuste a busca ou o filtro de papel."
        />
      ) : (
        <div className="hb-grid hb-grid-3">
          {members.map((member) => (
            <DirectoryCard key={member.id} member={member} />
          ))}
        </div>
      )}
    </div>
  );
}
