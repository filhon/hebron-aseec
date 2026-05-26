/**
 * Impersonation utilities — framework-agnostic.
 *
 * The impersonation state is stored in a cookie as a base64url-encoded JSON
 * payload (non-httpOnly so the banner can read it across apps).
 * The admin Server Actions are responsible for setting/clearing the cookie
 * via next/headers; this module only handles serialization + types.
 */

export const IMPERSONATION_COOKIE_NAME = "hb-impersonation";

/** 8 hours max — force re-initiation for long support sessions */
export const IMPERSONATION_COOKIE_MAX_AGE_SECONDS = 8 * 60 * 60;

export interface ImpersonationState {
  actorId: string;
  actorName: string;
  impersonatedId: string;
  impersonatedName: string;
  /** ISO-8601 timestamp of when impersonation began */
  startedAt: string;
}

export function serializeImpersonationState(state: ImpersonationState): string {
  return Buffer.from(JSON.stringify(state), "utf-8").toString("base64url");
}

export function parseImpersonationState(
  raw: string,
): ImpersonationState | null {
  try {
    const json = Buffer.from(raw, "base64url").toString("utf-8");
    const parsed: unknown = JSON.parse(json);
    if (!isImpersonationState(parsed)) return null;
    return parsed;
  } catch {
    return null;
  }
}

function isImpersonationState(v: unknown): v is ImpersonationState {
  if (typeof v !== "object" || v === null) return false;
  const s = v as Record<string, unknown>;
  return (
    typeof s["actorId"] === "string" &&
    typeof s["actorName"] === "string" &&
    typeof s["impersonatedId"] === "string" &&
    typeof s["impersonatedName"] === "string" &&
    typeof s["startedAt"] === "string"
  );
}
