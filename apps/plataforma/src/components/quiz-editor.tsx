"use client";

import * as React from "react";
import type { z } from "zod";
import type { Quiz, QuizQuestion } from "@hebron/types/plataforma";
import { createQuizSchema, type CreateQuizInput } from "@hebron/validators";
import { FormField, Input, Button } from "@hebron/ui";
import { Plus, Trash2 } from "lucide-react";

function cn(...cls: (string | false | null | undefined)[]): string {
  return cls.filter(Boolean).join(" ");
}

function fieldErrors(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !errors[key]) errors[key] = issue.message;
  }
  return errors;
}

function newQuestion(): QuizQuestion {
  const id = `local-q-${Date.now()}`;
  return {
    id,
    text: "",
    options: [
      { id: `${id}-a`, text: "" },
      { id: `${id}-b`, text: "" },
    ],
    correctOptionId: `${id}-a`,
  };
}

export interface QuizEditorProps {
  lessonId: string;
  quiz?: Quiz;
  onSubmit: (values: CreateQuizInput) => void;
  isLoading?: boolean;
  className?: string;
}

/** Criar/editar quiz: adicionar/remover perguntas, definir respostas
 * corretas e a nota mínima de aprovação. */
export function QuizEditor({
  lessonId,
  quiz,
  onSubmit,
  isLoading = false,
  className,
}: QuizEditorProps) {
  const [passingScore, setPassingScore] = React.useState(
    quiz?.passingScore ?? 70,
  );
  const [questions, setQuestions] = React.useState<QuizQuestion[]>(
    quiz?.questions ?? [newQuestion()],
  );
  const [errors, setErrors] = React.useState<Record<string, string>>({});

  function updateQuestionText(questionId: string, text: string) {
    setQuestions((prev) =>
      prev.map((q) => (q.id === questionId ? { ...q, text } : q)),
    );
  }

  function updateOptionText(
    questionId: string,
    optionId: string,
    text: string,
  ) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: q.options.map((o) =>
                o.id === optionId ? { ...o, text } : o,
              ),
            }
          : q,
      ),
    );
  }

  function setCorrectOption(questionId: string, optionId: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId ? { ...q, correctOptionId: optionId } : q,
      ),
    );
  }

  function addOption(questionId: string) {
    setQuestions((prev) =>
      prev.map((q) =>
        q.id === questionId
          ? {
              ...q,
              options: [
                ...q.options,
                { id: `${questionId}-opt-${Date.now()}`, text: "" },
              ],
            }
          : q,
      ),
    );
  }

  function removeOption(questionId: string, optionId: string) {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== questionId || q.options.length <= 2) return q;
        const options = q.options.filter((o) => o.id !== optionId);
        const correctOptionId =
          q.correctOptionId === optionId
            ? (options[0]?.id ?? "")
            : q.correctOptionId;
        return { ...q, options, correctOptionId };
      }),
    );
  }

  function addQuestion() {
    setQuestions((prev) => [...prev, newQuestion()]);
  }

  function removeQuestion(questionId: string) {
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    const result = createQuizSchema.safeParse({
      lessonId,
      questions,
      passingScore,
    });

    if (!result.success) {
      setErrors(fieldErrors(result.error));
      return;
    }

    setErrors({});
    onSubmit(result.data);
  }

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("space-y-6", className)}
    >
      <FormField
        label="Nota mínima de aprovação (%)"
        hint="Tentativas são ilimitadas — o aluno pode refazer até atingir a nota."
        error={errors.passingScore}
        required
      >
        <Input
          type="number"
          min={0}
          max={100}
          value={passingScore}
          onChange={(e) => setPassingScore(Number(e.target.value))}
          className="max-w-32"
        />
      </FormField>

      {errors.questions && (
        <p className="text-xs text-(--color-destructive)">{errors.questions}</p>
      )}

      <div className="space-y-5">
        {questions.map((question, index) => (
          <div
            key={question.id}
            className="space-y-3 rounded-md border border-(--border) bg-(--surface) p-4"
          >
            <div className="flex items-start gap-2">
              <FormField
                label={`Pergunta ${index + 1}`}
                error={errors[`questions.${index}.text`]}
                className="flex-1"
              >
                <Input
                  value={question.text}
                  onChange={(e) =>
                    updateQuestionText(question.id, e.target.value)
                  }
                />
              </FormField>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label="Remover pergunta"
                onClick={() => removeQuestion(question.id)}
                className="mt-6"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </Button>
            </div>

            <div className="space-y-2">
              {question.options.map((option) => (
                <div key={option.id} className="flex items-center gap-2.5">
                  <input
                    type="radio"
                    name={`correct-${question.id}`}
                    checked={question.correctOptionId === option.id}
                    onChange={() => setCorrectOption(question.id, option.id)}
                    aria-label="Marcar como correta"
                    className="h-4 w-4 shrink-0 accent-(--hb-blue)"
                  />
                  <Input
                    value={option.text}
                    onChange={(e) =>
                      updateOptionText(question.id, option.id, e.target.value)
                    }
                    placeholder="Texto da alternativa"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label="Remover alternativa"
                    disabled={question.options.length <= 2}
                    onClick={() => removeOption(question.id, option.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<Plus className="h-3.5 w-3.5" aria-hidden="true" />}
                onClick={() => addOption(question.id)}
              >
                Adicionar alternativa
              </Button>
            </div>
          </div>
        ))}

        <Button
          type="button"
          variant="outline"
          leftIcon={<Plus className="h-4 w-4" aria-hidden="true" />}
          onClick={addQuestion}
        >
          Adicionar pergunta
        </Button>
      </div>

      <Button type="submit" disabled={isLoading} loading={isLoading}>
        {quiz ? "Salvar alterações" : "Criar quiz"}
      </Button>
    </form>
  );
}
