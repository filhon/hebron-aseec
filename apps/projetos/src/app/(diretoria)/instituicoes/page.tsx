import { Building2 } from "lucide-react";
import {
  getAllOrganizationsForDiretoria,
  getOrganizationMembers,
} from "../../../lib/queries";
import { OrganizationMembers } from "../../../components/organization-members";

export default async function DiretoriaInstituicoesPage() {
  const orgs = await getAllOrganizationsForDiretoria();
  const membersByOrg = await Promise.all(
    orgs.map((org) => getOrganizationMembers(org.id)),
  );

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
      <div>
        <p className="hb-eyebrow mb-1">Diretoria</p>
        <h1
          className="text-2xl font-bold text-(--fg)"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Instituições
        </h1>
        <p className="text-sm text-(--fg-muted) mt-1">
          {orgs.length} instituições cadastradas · gerencie os representantes de
          cada uma.
        </p>
      </div>

      {orgs.length === 0 ? (
        <div
          className="rounded-lg border border-dashed px-8 py-16 flex flex-col items-center text-center gap-4"
          style={{
            borderColor: "var(--hb-gray-200)",
            backgroundColor: "var(--bg-alt)",
          }}
        >
          <Building2
            className="w-10 h-10"
            style={{ color: "var(--fg-subtle)" }}
            aria-hidden
          />
          <p className="text-sm text-(--fg-muted)">
            Nenhuma instituição cadastrada ainda.
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {orgs.map((org, idx) => (
            <div key={org.id} className="flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "var(--brand-tint)" }}
                >
                  <Building2
                    className="w-5 h-5"
                    style={{ color: "var(--hb-blue)" }}
                    aria-hidden
                  />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-base font-bold text-(--fg) truncate"
                    style={{ fontFamily: "var(--font-display)" }}
                  >
                    {org.nome}
                  </p>
                  <p className="text-xs text-(--fg-muted)">
                    {org.cnpj ? `CNPJ: ${org.cnpj} · ` : ""}
                    {org.memberCount} representante
                    {org.memberCount !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>

              <OrganizationMembers
                organizationId={org.id}
                members={membersByOrg[idx] ?? []}
                canManage
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
