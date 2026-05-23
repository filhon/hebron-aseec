"use client";

import * as React from "react";
import { Plus, Mail } from "lucide-react";
import { PageHeader, EmptyState, Button } from "@hebron/ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@hebron/ui";
import type { InvitationStatus } from "@hebron/types/admin";
import { mockInvitations, mockUsers } from "../../../lib/mock-data";
import { InvitationCard } from "../../../components/invitation-card";

const STATUS_OPTIONS: { value: InvitationStatus | "all"; label: string }[] = [
  { value: "all", label: "Todos os status" },
  { value: "pending", label: "Pendente" },
  { value: "accepted", label: "Aceito" },
  { value: "expired", label: "Expirado" },
  { value: "revoked", label: "Revogado" },
];

export default function ConvitesPage() {
  const [statusFilter, setStatusFilter] = React.useState<
    InvitationStatus | "all"
  >("all");

  const invitationsWithSender = mockInvitations.map((inv) => {
    const sender = mockUsers.find((u) => u.id === inv.invitedBy);
    return { ...inv, invitedByName: sender?.name ?? "Desconhecido" };
  });

  const filtered = invitationsWithSender.filter(
    (inv) => statusFilter === "all" || inv.status === statusFilter,
  );

  const pendingCount = mockInvitations.filter(
    (i) => i.status === "pending",
  ).length;

  return (
    <div
      style={{
        padding: "1.5rem",
        maxWidth: "56rem",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.5rem",
      }}
    >
      <PageHeader
        title="Convites"
        description={`${pendingCount} pendente${pendingCount !== 1 ? "s" : ""}`}
        actions={
          <Button leftIcon={<Plus size={16} aria-hidden="true" />}>
            Novo convite
          </Button>
        }
      />

      {/* Filter */}
      <div style={{ maxWidth: "14rem" }}>
        <Select
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as InvitationStatus | "all")}
        >
          <SelectTrigger aria-label="Filtrar por status">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Result count */}
      <p
        style={{
          fontSize: "var(--text-xs)",
          color: "var(--color-muted-foreground)",
        }}
      >
        {filtered.length} convite{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Cards */}
      {filtered.length === 0 ? (
        <EmptyState
          title="Nenhum convite encontrado."
          icon={Mail}
          quote={{
            text: "Ide, pois, e fazei discípulos de todas as nações",
            reference: "Mateus 28:19",
          }}
        />
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(18rem, 1fr))",
            gap: "1rem",
          }}
        >
          {filtered.map((inv) => (
            <InvitationCard
              key={inv.id}
              invitation={inv}
              invitedByName={inv.invitedByName}
            />
          ))}
        </div>
      )}
    </div>
  );
}
