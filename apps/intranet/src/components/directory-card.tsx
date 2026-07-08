import { Mail, Phone } from "lucide-react";
import { Avatar } from "@hebron/ui";
import type { DirectoryMember } from "@hebron/types/intranet";

export interface DirectoryCardProps {
  member: DirectoryMember;
}

export function DirectoryCard({ member }: DirectoryCardProps) {
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
        {member.bio && (
          <p
            className="line-clamp-2 text-(--text-xs) text-(--fg-muted)"
            style={{ marginTop: 8 }}
          >
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
