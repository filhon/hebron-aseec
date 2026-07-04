"use client";

import { useState } from "react";
import { Check, AlertCircle } from "lucide-react";
import {
  SubscriptionForm,
  type SubscriptionFormValues,
} from "../../components/subscription-form";
import { subscribe, unsubscribe } from "../../actions/subscriptions";
import type { Category } from "@hebron/types/documentos";

export function AssinaturasClient({
  categories,
  userEmail,
  initialSubscribedIds,
}: {
  categories: Category[];
  userEmail: string;
  initialSubscribedIds: string[];
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [subscribedIds, setSubscribedIds] = useState(
    new Set(initialSubscribedIds),
  );

  const initialSubscriptions = initialSubscribedIds.map((categoryId) => ({
    categoryId,
    onNewVersion: true,
    onEditalOpen: true,
  }));

  async function handleSubmit(values: SubscriptionFormValues) {
    setIsLoading(true);
    setError(null);
    setSaved(false);
    try {
      const nextIds = new Set(
        values.subscriptions
          .filter((s) => s.onNewVersion || s.onEditalOpen)
          .map((s) => s.categoryId),
      );

      const toSubscribe = [...nextIds].filter((id) => !subscribedIds.has(id));
      const toUnsubscribe = [...subscribedIds].filter((id) => !nextIds.has(id));

      await Promise.all([
        ...toSubscribe.map((categoryId) => subscribe({ categoryId })),
        ...toUnsubscribe.map((categoryId) => unsubscribe({ categoryId })),
      ]);

      setSubscribedIds(nextIds);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao salvar preferências.",
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div>
      {(saved || error) && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "10px 14px",
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13.5,
            background: error
              ? "var(--color-destructive-muted)"
              : "var(--hb-green-muted)",
            color: error ? "var(--hb-red)" : "var(--hb-green-fg)",
          }}
        >
          {error ? (
            <AlertCircle size={14} aria-hidden="true" />
          ) : (
            <Check size={14} aria-hidden="true" />
          )}
          {error ?? "Preferências salvas."}
        </div>
      )}

      <SubscriptionForm
        categories={categories}
        userEmail={userEmail}
        initialSubscriptions={initialSubscriptions}
        onSubmit={(values) => void handleSubmit(values)}
        isLoading={isLoading}
      />
    </div>
  );
}
