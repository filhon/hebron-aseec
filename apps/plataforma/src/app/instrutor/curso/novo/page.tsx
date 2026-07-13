"use client";

import * as React from "react";
import Link from "next/link";
import {
  PageHeader,
  FormField,
  Input,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Button,
} from "@hebron/ui";
import { CheckCircle2 } from "lucide-react";
import { mockCourses, mockInstructors } from "../../../../lib/mock-data";

function slugify(title: string): string {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export default function NovoCursoPage() {
  const [title, setTitle] = React.useState("");
  const [slug, setSlug] = React.useState("");
  const [category, setCategory] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [instructorId, setInstructorId] = React.useState(
    mockInstructors[0]?.id ?? "",
  );
  const [created, setCreated] = React.useState(false);

  const categories = Array.from(new Set(mockCourses.map((c) => c.category)));

  const canSubmit =
    title.trim().length >= 3 &&
    slug.trim().length >= 3 &&
    description.trim().length >= 10;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setCreated(true);
  }

  if (created) {
    return (
      <div className="mx-auto max-w-2xl px-6 py-8">
        <div className="flex flex-col items-center gap-4 rounded-(--radius-md) border border-(--border) bg-(--surface) p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-(--color-success-muted)">
            <CheckCircle2
              className="h-6 w-6 text-(--hb-green-deep)"
              aria-hidden="true"
            />
          </div>
          <h1 className="font-(--font-display) text-lg font-(--font-weight-semibold) text-(--fg)">
            Rascunho de curso criado
          </h1>
          <p className="max-w-sm text-sm text-(--fg-muted)">
            “{title}” foi salvo como rascunho. Nesta fase (Bloco A) a criação
            ainda não é persistida — o Bloco B conecta este formulário ao banco
            de dados e leva você direto ao editor do curso recém-criado.
          </p>
          <Button asChild variant="outline">
            <Link href="/instrutor">Voltar ao painel</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-6 py-8">
      <PageHeader
        title="Novo curso"
        description="Preencha as informações básicas. Módulos e aulas são adicionados no editor do curso."
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        <FormField label="Título" required>
          <Input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setSlug(slugify(e.target.value));
            }}
            placeholder="Ex.: Fundamentos da Liderança Cristã"
          />
        </FormField>

        <FormField
          label="Slug"
          hint="Usado na URL pública do curso. Gerado automaticamente a partir do título."
          required
        >
          <Input
            value={slug}
            onChange={(e) => setSlug(slugify(e.target.value))}
          />
        </FormField>

        <FormField label="Categoria" required>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
              <SelectItem value="Nova categoria">Nova categoria</SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        <FormField label="Instrutor" required>
          <Select value={instructorId} onValueChange={setInstructorId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione um instrutor" />
            </SelectTrigger>
            <SelectContent>
              {mockInstructors.map((instructor) => (
                <SelectItem key={instructor.id} value={instructor.id}>
                  {instructor.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FormField>

        <FormField
          label="Descrição"
          hint="Explique o objetivo do curso e para quem ele é indicado."
          required
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            className="w-full resize-none rounded-(--radius) border border-(--border) bg-(--bg-alt) px-3 py-2 text-sm text-(--fg) outline-none transition-colors placeholder:text-(--fg-muted) focus:border-(--brand)"
            placeholder="Descreva o conteúdo e os objetivos do curso…"
          />
        </FormField>

        <div className="flex gap-3">
          <Button type="submit" disabled={!canSubmit}>
            Criar curso
          </Button>
          <Button asChild variant="ghost">
            <Link href="/instrutor">Cancelar</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
