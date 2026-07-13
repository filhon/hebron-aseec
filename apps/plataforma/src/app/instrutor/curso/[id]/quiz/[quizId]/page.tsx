"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { PageHeader, EmptyState, Button, FormField, Input } from "@hebron/ui";
import { CheckCircle2, HelpCircle, Plus, Trash2 } from "lucide-react";
import type { QuizQuestion } from "@hebron/types/plataforma";
import {
  mockCourses,
  mockLessons,
  mockQuizzes,
} from "../../../../../../lib/mock-data";

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

export default function EditorQuizPage() {
  const { id, quizId } = useParams<{ id: string; quizId: string }>();
  const router = useRouter();

  const course = mockCourses.find((c) => c.id === id);
  const quiz = mockQuizzes.find((q) => q.id === quizId);
  const lesson = quiz
    ? mockLessons.find((l) => l.id === quiz.lessonId && l.courseId === id)
    : undefined;

  const [passingScore, setPassingScore] = React.useState(
    quiz?.passingScore ?? 70,
  );
  const [questions, setQuestions] = React.useState<QuizQuestion[]>(
    quiz?.questions ?? [],
  );
  const [saved, setSaved] = React.useState(false);

  if (!course || !quiz || !lesson) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-8">
        <EmptyState
          icon={HelpCircle}
          title="Quiz não encontrado"
          description="Este quiz não existe ou foi removido."
          action={
            <Button
              variant="outline"
              onClick={() => router.push(`/instrutor/curso/${id}`)}
            >
              Voltar ao editor do curso
            </Button>
          }
          hideQuote
        />
      </div>
    );
  }

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
    setSaved(true);
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <PageHeader
        breadcrumb={[
          { label: "Painel", href: "/instrutor" },
          { label: course.title, href: `/instrutor/curso/${course.id}` },
          { label: lesson.title },
        ]}
        title="Editar quiz"
        description={lesson.title}
      />

      {saved && (
        <div className="mb-6 flex items-center gap-2.5 rounded-(--radius) border border-(--hb-green-deep) bg-(--color-success-muted) px-4 py-3 text-sm text-(--hb-green-fg)">
          <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          Alterações salvas nesta sessão (sem persistência — Bloco B conecta ao
          banco).
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <FormField
          label="Nota mínima de aprovação (%)"
          hint="Tentativas são ilimitadas — o aluno pode refazer até atingir a nota."
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

        <div className="space-y-5">
          {questions.map((question, index) => (
            <div
              key={question.id}
              className="space-y-3 rounded-(--radius-md) border border-(--border) bg-(--surface) p-4"
            >
              <div className="flex items-start gap-2">
                <FormField label={`Pergunta ${index + 1}`} className="flex-1">
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

        <div className="flex gap-3">
          <Button type="submit">Salvar alterações</Button>
          <Button asChild variant="ghost">
            <Link href={`/instrutor/curso/${course.id}`}>Voltar ao curso</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
