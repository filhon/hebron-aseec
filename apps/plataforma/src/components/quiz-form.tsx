"use client";

import * as React from "react";
import type { Quiz, QuizAnswer, QuizAttempt } from "@hebron/types/plataforma";
import { Button } from "@hebron/ui";
import { CheckCircle2, XCircle } from "lucide-react";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

export interface QuizFormProps {
  quiz: Quiz;
  /** Tentativa mais recente do usuário — exibe o resultado antes de uma nova tentativa. */
  lastAttempt?: QuizAttempt;
  onSubmit: (answers: QuizAnswer[]) => void;
  isLoading?: boolean;
  className?: string;
}

/**
 * As perguntas do banco (PATCH-010) só suportam alternativas de múltipla
 * escolha (`options` + `correctOptionId`) — não há campo para questão
 * dissertativa no tipo `QuizQuestion` de P-6.1. Registrado como débito em
 * SESSIONS.md; este componente cobre apenas múltipla escolha.
 */
export function QuizForm({
  quiz,
  lastAttempt,
  onSubmit,
  isLoading = false,
  className,
}: QuizFormProps) {
  const [answers, setAnswers] = React.useState<Record<string, string>>({});

  const allAnswered = quiz.questions.every((q) => answers[q.id]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!allAnswered) return;
    onSubmit(
      quiz.questions.map((q) => ({
        questionId: q.id,
        optionId: answers[q.id] as string,
      })),
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-6", className)}
    >
      {lastAttempt && (
        <div
          className={cn(
            "flex items-center gap-2.5 rounded-(--radius) border px-4 py-3 text-sm",
            lastAttempt.passed
              ? "border-(--hb-green-deep) bg-(--color-success-muted) text-(--hb-green-fg)"
              : "border-(--hb-orange) bg-(--color-warning-muted) text-(--hb-orange-deep)",
          )}
        >
          {lastAttempt.passed ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <XCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>
            Última tentativa: {lastAttempt.score}% (
            {lastAttempt.passed ? "aprovado" : "não atingiu a nota mínima"},{" "}
            {quiz.passingScore}% necessários)
          </span>
        </div>
      )}

      <ol className="space-y-6">
        {quiz.questions.map((question, index) => (
          <li key={question.id} className="space-y-3">
            <p className="text-sm font-(--font-weight-semibold) text-(--fg)">
              <span className="text-(--fg-muted)">{index + 1}. </span>
              {question.text}
            </p>

            <div
              role="radiogroup"
              aria-label={question.text}
              className="flex flex-col gap-2"
            >
              {question.options.map((option) => {
                const selected = answers[question.id] === option.id;
                return (
                  <label
                    key={option.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-2.5 rounded-(--radius) border px-3.5 py-2.5 text-sm transition-colors",
                      selected
                        ? "border-(--brand) bg-(--brand-muted) text-(--fg)"
                        : "border-(--border) text-(--fg) hover:bg-(--surface-alt)",
                    )}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option.id}
                      checked={selected}
                      onChange={() =>
                        setAnswers((prev) => ({
                          ...prev,
                          [question.id]: option.id,
                        }))
                      }
                      className="h-4 w-4 shrink-0 accent-(--hb-blue)"
                    />
                    {option.text}
                  </label>
                );
              })}
            </div>
          </li>
        ))}
      </ol>

      <Button
        type="submit"
        disabled={!allAnswered || isLoading}
        loading={isLoading}
      >
        Enviar respostas
      </Button>
    </form>
  );
}
