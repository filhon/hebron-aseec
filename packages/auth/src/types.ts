import type { Session, User, AuthError } from "@supabase/supabase-js";
import type { Role } from "@hebron/types/roles";

export type { Session, User, AuthError };

/** Auth method for sign-in */
export type AuthMethod = "password" | "magic_link";

/** Result of a sign-in attempt */
export interface SignInResult {
  error: AuthError | null;
}

/** Result of MFA enrollment */
export interface MfaEnrollResult {
  factorId: string;
  qrCode: string;
  secret: string;
  error: AuthError | null;
}

/** Result of an MFA challenge + verify */
export interface MfaVerifyResult {
  error: AuthError | null;
}

/** Supabase TOTP factor shape (minimal) */
export interface TotpFactor {
  id: string;
  friendly_name?: string;
  factor_type: "totp";
  status: "verified" | "unverified";
}

/** AAL level reported by Supabase */
export type AssuranceLevel = "aal1" | "aal2";

export interface AuthAssuranceLevel {
  currentLevel: AssuranceLevel | null;
  nextLevel: AssuranceLevel | null;
}

/** Roles that require mandatory TOTP MFA */
export const MFA_REQUIRED_ROLES: readonly Role[] = [
  "super_admin",
  "diretor",
] as const;
