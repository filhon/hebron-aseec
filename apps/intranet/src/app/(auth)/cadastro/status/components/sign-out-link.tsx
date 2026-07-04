"use client";

import { signOut } from "@hebron/auth";

export function SignOutLink() {
  return (
    <button
      type="button"
      onClick={async () => {
        await signOut();
        window.location.replace("/login");
      }}
      className="text-(--text-sm) font-medium text-(--color-primary) underline-offset-2 hover:underline"
    >
      Sair
    </button>
  );
}
