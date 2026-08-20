/**
 * impersonation.test.ts — pure unit coverage for the cookie's crypto/expiry
 * envelope (no DB, no Supabase — see server-impersonation.test.ts for the
 * resolveSession integration coverage of PACOTE 6).
 */
import { describe, it, expect } from "vitest";
import {
  serializeImpersonationState,
  parseImpersonationState,
  resolveVerifiedImpersonationState,
  IMPERSONATION_COOKIE_MAX_AGE_SECONDS,
  type ImpersonationState,
} from "../impersonation";

const BASE_STATE: ImpersonationState = {
  actorId: "a1000000-0000-0000-0000-000000000001",
  actorName: "Super Admin",
  impersonatedId: "a1000000-0000-0000-0000-000000000002",
  impersonatedName: "Usuário Alvo",
  startedAt: new Date().toISOString(),
};

describe("resolveVerifiedImpersonationState", () => {
  it("returns null for undefined/empty input", () => {
    expect(resolveVerifiedImpersonationState(undefined)).toBeNull();
    expect(resolveVerifiedImpersonationState("")).toBeNull();
  });

  it("returns null for a tampered payload (signature mismatch)", () => {
    const raw = serializeImpersonationState(BASE_STATE);
    const [payload] = raw.split(".");
    const tampered = `${payload}.${"a".repeat(43)}`;
    expect(resolveVerifiedImpersonationState(tampered)).toBeNull();
  });

  it("returns the state for a freshly-signed, unexpired cookie", () => {
    const raw = serializeImpersonationState(BASE_STATE);
    expect(resolveVerifiedImpersonationState(raw)).toEqual(BASE_STATE);
  });

  it("returns null once the 8h ceiling has passed, even with a valid signature", () => {
    const stale: ImpersonationState = {
      ...BASE_STATE,
      startedAt: new Date(
        Date.now() - (IMPERSONATION_COOKIE_MAX_AGE_SECONDS + 60) * 1000,
      ).toISOString(),
    };
    const raw = serializeImpersonationState(stale);
    // Sanity: signature itself is still valid — only the age check should reject it.
    expect(parseImpersonationState(raw)).not.toBeNull();
    expect(resolveVerifiedImpersonationState(raw)).toBeNull();
  });

  it("returns null for a cookie whose startedAt is in the future", () => {
    const future: ImpersonationState = {
      ...BASE_STATE,
      startedAt: new Date(Date.now() + 60_000).toISOString(),
    };
    const raw = serializeImpersonationState(future);
    expect(resolveVerifiedImpersonationState(raw)).toBeNull();
  });

  it("accepts a cookie right at the ceiling boundary", () => {
    const boundary: ImpersonationState = {
      ...BASE_STATE,
      startedAt: new Date(
        Date.now() - IMPERSONATION_COOKIE_MAX_AGE_SECONDS * 1000 + 1000,
      ).toISOString(),
    };
    const raw = serializeImpersonationState(boundary);
    expect(resolveVerifiedImpersonationState(raw)).not.toBeNull();
  });
});
