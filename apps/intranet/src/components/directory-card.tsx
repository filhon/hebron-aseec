"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, Pencil, Phone } from "lucide-react";
import { Avatar } from "@hebron/ui";
import { getSession } from "@hebron/auth/client";
import type { DirectoryMember } from "@hebron/types/intranet";

export interface DirectoryCardProps {
  member: DirectoryMember;
}

// P-5.1b — o próprio cartão é um dos dois pontos de entrada para editar bio/
// foto/telefone (o outro é /meus-dados). DirectoryCard já roda no cliente
// (importado por directory-list.tsx, "use client"), então a comparação com o
// usuário logado é feita aqui via sessão do browser — sem prop de
// currentUserId vinda de cima (directory-list.tsx/diretorio/page.tsx não
// estão nos arquivos permitidos deste prompt).
export function DirectoryCard({ member }: DirectoryCardProps) {
  const [isOwnProfile, setIsOwnProfile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getSession().then(({ session }) => {
      if (!cancelled && session?.user.id === member.userId) {
        setIsOwnProfile(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [member.userId]);

  return (
    <div
      className="hb-card hb-card-padded"
      style={{ display: "flex", gap: 14 }}
    >
      <Avatar
        name={member.name}
        avatarUrl={member.avatarUrl ?? undefined}
        size="lg"
      />
      <div style={{ minWidth: 0, flex: 1 }}>
        <p
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 15,
            color: "var(--fg)",
            margin: 0,
          }}
        >
          {member.name}
        </p>
        <span className="hb-badge" style={{ marginTop: 4 }}>
          {member.role}
        </span>
        {isOwnProfile && (
          <Link
            href="/meus-dados"
            className="hb-card-header-hint hover:text-(--brand)"
            style={{ marginTop: 8 }}
          >
            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
            Editar perfil
          </Link>
        )}
        {member.bio && (
          <p className="line-clamp-2 text-xs" style={{ marginTop: 8 }}>
            {member.bio}
          </p>
        )}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 4,
            marginTop: 10,
          }}
        >
          <a
            href={`mailto:${member.email}`}
            className="hb-card-header-hint hover:text-(--brand)"
          >
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            {member.email}
          </a>
          {member.phone && (
            <a
              href={`tel:${member.phone}`}
              className="hb-card-header-hint hover:text-(--brand)"
            >
              <Phone className="h-3.5 w-3.5" aria-hidden="true" />
              {member.phone}
            </a>
          )}
        </div>
      </div>
    </div>
  );
}
