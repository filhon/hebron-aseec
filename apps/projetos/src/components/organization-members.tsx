"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction } from "next-safe-action/hooks";
import { Users, UserPlus, X } from "lucide-react";
import {
  addOrganizationMember,
  removeOrganizationMember,
} from "../actions/organizations";
import { findUserByEmail } from "../lib/queries";
import type { OrganizationMemberRow } from "../lib/queries";

/** Lista de membros de uma organização — usado tanto na tela do submissor
 * (leitura, `canManage=false`) quanto na tela da diretoria (gerenciamento
 * completo, `canManage=true`). Adicionar/remover é ato de governança
 * (P-2.8c, ver SESSIONS.md): a lista decide quem enxerga os projetos da
 * organização via RLS projects_select_own_or_org — por isso não é
 * self-service do criador. */
export function OrganizationMembers({
  organizationId,
  members,
  canManage,
}: {
  organizationId: string;
  members: OrganizationMemberRow[];
  canManage: boolean;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const { execute: addMember, isPending: isAdding } = useAction(
    addOrganizationMember,
    {
      onSuccess() {
        setEmail("");
        router.refresh();
      },
      onError({ error }) {
        setLookupError(
          error.serverError ?? "Não foi possível adicionar o membro.",
        );
      },
    },
  );

  const { execute: removeMember, isPending: isRemoving } = useAction(
    removeOrganizationMember,
    {
      onSuccess() {
        router.refresh();
      },
    },
  );

  async function handleAdd() {
    setLookupError(null);
    const trimmed = email.trim();
    if (!trimmed) return;

    setIsLookingUp(true);
    const user = await findUserByEmail(trimmed);
    setIsLookingUp(false);

    if (!user) {
      setLookupError("Nenhum usuário encontrado com este e-mail.");
      return;
    }
    if (members.some((m) => m.userId === user.id)) {
      setLookupError("Este usuário já é membro da organização.");
      return;
    }
    addMember({ organizationId, userId: user.id });
  }

  return (
    <section
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        boxShadow: "var(--shadow-sm)",
        padding: 24,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 16,
        }}
      >
        <Users
          width={20}
          height={20}
          style={{ color: "var(--hb-blue)" }}
          aria-hidden
        />
        <h2
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 17,
            margin: 0,
            color: "var(--fg)",
          }}
        >
          Representantes
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        {members.map((m) => (
          <div
            key={m.userId}
            className="flex items-center justify-between gap-3 rounded-md px-3.5 py-2.5"
            style={{ backgroundColor: "var(--surface-alt)" }}
          >
            <div className="min-w-0">
              <p className="text-sm font-semibold text-(--fg) truncate">
                {m.fullName ?? m.email}
              </p>
              <p className="text-xs text-(--fg-muted) truncate">{m.email}</p>
            </div>
            {canManage && (
              <button
                type="button"
                onClick={() =>
                  removeMember({ organizationId, userId: m.userId })
                }
                disabled={isRemoving || members.length <= 1}
                title={
                  members.length <= 1
                    ? "Não é possível remover o último membro"
                    : "Remover representante"
                }
                className="shrink-0 rounded-md p-1.5 text-(--fg-muted) hover:text-(--color-destructive) hover:bg-(--color-destructive-muted) transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <X className="w-4 h-4" aria-hidden />
              </button>
            )}
          </div>
        ))}
      </div>

      {canManage ? (
        <div
          className="mt-4 pt-4"
          style={{ borderTop: "1px solid var(--divider)" }}
        >
          <label className="text-xs font-semibold text-(--fg) block mb-1.5">
            Adicionar representante por e-mail
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="pessoa@exemplo.com"
              className="flex-1 rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3.5 py-2.5 text-sm text-(--fg) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-(--brand)"
            />
            <button
              type="button"
              onClick={() => void handleAdd()}
              disabled={!email.trim() || isLookingUp || isAdding}
              className="inline-flex items-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 shrink-0"
              style={{ backgroundColor: "var(--hb-blue)" }}
            >
              <UserPlus className="w-4 h-4" aria-hidden />
              {isLookingUp || isAdding ? "Adicionando…" : "Adicionar"}
            </button>
          </div>
          {lookupError && (
            <p className="text-xs text-(--color-destructive) mt-1.5">
              {lookupError}
            </p>
          )}
        </div>
      ) : (
        <p
          className="text-xs text-(--fg-muted) mt-4 pt-4"
          style={{ borderTop: "1px solid var(--divider)" }}
        >
          Para adicionar ou remover representantes desta instituição, entre em
          contato com a diretoria.
        </p>
      )}
    </section>
  );
}
