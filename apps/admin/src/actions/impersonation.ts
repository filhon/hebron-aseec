"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { db } from "@hebron/db/client";
import { eq } from "drizzle-orm";
import { users, roleAssignments } from "@hebron/db/schema";
import { logAudit } from "../lib/audit";
import {
  IMPERSONATION_COOKIE_NAME,
  IMPERSONATION_COOKIE_MAX_AGE_SECONDS,
  parseImpersonationState,
  serializeImpersonationState,
} from "@hebron/auth/impersonation";

// ─── Auth helper ─────────────────────────────────────────────────────────────

async function requireSuperAdmin(): Promise<string> {
  const cookieStore = await cookies();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) throw new Error("Supabase env vars ausentes");

  const allCookies = cookieStore.getAll();
  const cookieHeader = allCookies.map((c) => `${c.name}=${c.value}`).join("; ");

  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { cookie: cookieHeader } },
    auth: { persistSession: false },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) throw new Error("Não autenticado");

  const rows = await db
    .select({ role: roleAssignments.role })
    .from(roleAssignments)
    .where(eq(roleAssignments.userId, user.id));

  if (!rows.some((r) => r.role === "super_admin")) {
    throw new Error("Acesso negado: apenas super_admin pode impersonar");
  }

  return user.id;
}

const COOKIE_DOMAIN =
  process.env.NODE_ENV === "production" ? ".hebronaseec.com.br" : undefined;

// ─── Start impersonation ──────────────────────────────────────────────────────

export async function startImpersonationAction(
  formData: FormData,
): Promise<void> {
  const actorId = await requireSuperAdmin();
  const targetUserId = formData.get("userId") as string;

  if (!targetUserId) throw new Error("userId ausente");
  if (targetUserId === actorId)
    throw new Error("Não é possível impersonar a si mesmo");

  const [actorRows, targetRows] = await Promise.all([
    db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, actorId)),
    db
      .select({ fullName: users.fullName })
      .from(users)
      .where(eq(users.id, targetUserId)),
  ]);

  const actor = actorRows[0];
  const target = targetRows[0];
  if (!target) throw new Error("Usuário alvo não encontrado");

  const state = {
    actorId,
    actorName: actor?.fullName ?? "Super Admin",
    impersonatedId: targetUserId,
    impersonatedName: target.fullName ?? targetUserId,
    startedAt: new Date().toISOString(),
  };

  const cookieStore = await cookies();
  cookieStore.set(
    IMPERSONATION_COOKIE_NAME,
    serializeImpersonationState(state),
    {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: IMPERSONATION_COOKIE_MAX_AGE_SECONDS,
      path: "/",
      ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
    },
  );

  const headersList = await headers();
  const ip =
    headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

  await logAudit({
    actorId,
    action: "user.impersonated",
    entity: "user",
    entityId: targetUserId,
    diff: {
      event: "start",
      actorName: state.actorName,
      impersonatedName: state.impersonatedName,
    },
    ip,
  });

  redirect(`/usuarios/${targetUserId}?success=impersonation-started`);
}

// ─── Stop impersonation ───────────────────────────────────────────────────────

export async function stopImpersonationAction(
  _formData: FormData,
): Promise<void> {
  const actorId = await requireSuperAdmin();

  const cookieStore = await cookies();
  const raw = cookieStore.get(IMPERSONATION_COOKIE_NAME)?.value;
  const state = raw ? parseImpersonationState(raw) : null;

  cookieStore.delete({
    name: IMPERSONATION_COOKIE_NAME,
    path: "/",
    ...(COOKIE_DOMAIN ? { domain: COOKIE_DOMAIN } : {}),
  });

  if (state) {
    const durationMs = Date.now() - new Date(state.startedAt).getTime();

    const headersList = await headers();
    const ip =
      headersList.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;

    await logAudit({
      actorId,
      action: "user.impersonated",
      entity: "user",
      entityId: state.impersonatedId,
      diff: {
        event: "stop",
        actorName: state.actorName,
        impersonatedName: state.impersonatedName,
        durationMs,
        durationLabel: formatDuration(durationMs),
      },
      ip,
    });
  }

  redirect("/usuarios");
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDuration(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
