import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuthAssuranceLevel,
  MfaEnrollResult,
  MfaVerifyResult,
  TotpFactor,
} from "./types";
import { MFA_REQUIRED_ROLES } from "./types";
import type { Role } from "@hebron/types/roles";

/**
 * Returns whether the given role requires mandatory TOTP MFA.
 */
export function isMfaRequired(role: Role): boolean {
  return (MFA_REQUIRED_ROLES as readonly string[]).includes(role);
}

/**
 * Returns whether any of the given roles require mandatory TOTP MFA.
 */
export function anyRoleRequiresMfa(roles: Role[]): boolean {
  return roles.some(isMfaRequired);
}

/**
 * Returns the current and next AAL (Authenticator Assurance Level) for the
 * active session. Use this after password sign-in to determine if TOTP
 * verification is required.
 *
 * - `aal1` — authenticated with email+password or magic link only
 * - `aal2` — authenticated + TOTP verified
 */
export async function getAssuranceLevel(
  supabase: SupabaseClient,
): Promise<AuthAssuranceLevel> {
  const { data, error } =
    await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error) {
    return { currentLevel: null, nextLevel: null };
  }
  return {
    currentLevel: data.currentLevel as AuthAssuranceLevel["currentLevel"],
    nextLevel: data.nextLevel as AuthAssuranceLevel["nextLevel"],
  };
}

/**
 * Enroll the current user in TOTP MFA.
 * Returns a QR code data URL and the raw TOTP secret for manual entry.
 */
export async function enrollTotp(
  supabase: SupabaseClient,
  friendlyName?: string,
): Promise<MfaEnrollResult> {
  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: "totp",
    friendlyName,
  });

  if (error || !data) {
    return { factorId: "", qrCode: "", secret: "", error };
  }

  return {
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
    error: null,
  };
}

/**
 * Challenge and immediately verify a TOTP code.
 * Use this during enrollment to confirm the user has set up their authenticator.
 */
export async function verifytotpEnrollment(
  supabase: SupabaseClient,
  factorId: string,
  code: string,
): Promise<MfaVerifyResult> {
  const { error } = await supabase.auth.mfa.challengeAndVerify({
    factorId,
    code,
  });
  return { error };
}

/**
 * Issue a new TOTP challenge for the user's first verified factor.
 * Returns the challenge ID required for verification.
 */
export async function createTotpChallenge(supabase: SupabaseClient): Promise<{
  challengeId: string | null;
  factorId: string | null;
  error: unknown;
}> {
  const { data: factors, error: listError } =
    await supabase.auth.mfa.listFactors();

  if (listError || !factors) {
    return { challengeId: null, factorId: null, error: listError };
  }

  const totp = factors.totp.find((f: TotpFactor) => f.status === "verified");

  if (!totp) {
    return {
      challengeId: null,
      factorId: null,
      error: new Error("Nenhum fator TOTP verificado encontrado."),
    };
  }

  const { data, error } = await supabase.auth.mfa.challenge({
    factorId: totp.id,
  });

  if (error || !data) {
    return { challengeId: null, factorId: null, error };
  }

  return { challengeId: data.id, factorId: totp.id, error: null };
}

/**
 * Verify a TOTP code against an existing challenge.
 * On success, the session is elevated to AAL2.
 */
export async function verifyTotpChallenge(
  supabase: SupabaseClient,
  factorId: string,
  challengeId: string,
  code: string,
): Promise<MfaVerifyResult> {
  const { error } = await supabase.auth.mfa.verify({
    factorId,
    challengeId,
    code,
  });
  return { error };
}

/**
 * Returns whether the current session already has a verified TOTP factor.
 * A role that requires MFA but has no verified factor must be sent to
 * enrollment, not to a challenge — `getAuthenticatorAssuranceLevel()` alone
 * cannot tell these two cases apart (its `nextLevel` only reports "aal2" when
 * a verified factor already exists).
 *
 * Também é o gate inverso da página de enrollment: `true` significa que a
 * pessoa já enrolou e deve ir para o desafio, não para um segundo enrollment.
 * Um fator apenas `unverified` (enrollment interrompido no meio) devolve
 * `false` de propósito — ela precisa poder concluir o que começou.
 */
export async function hasVerifiedTotpFactor(
  supabase: SupabaseClient,
): Promise<boolean> {
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return false;
  return data.totp.some((f: TotpFactor) => f.status === "verified");
}
