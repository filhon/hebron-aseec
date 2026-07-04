"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { SearchBar } from "../../components/search-bar";
import type { SearchFilters } from "../../components/search-bar";
import type { Category, Tag } from "@hebron/types/documentos";

export function BuscaSearchBar({
  categories,
  tags,
  initialFilters,
}: {
  categories: Category[];
  tags: Tag[];
  initialFilters: SearchFilters;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function handleChange(filters: SearchFilters) {
    const params = new URLSearchParams(searchParams.toString());

    if (filters.query) params.set("q", filters.query);
    else params.delete("q");

    if (filters.categoryId) params.set("categoria", filters.categoryId);
    else params.delete("categoria");

    if (filters.tagIds.length > 0) params.set("tags", filters.tagIds.join(","));
    else params.delete("tags");

    const qs = params.toString();
    router.push(`/busca${qs ? `?${qs}` : ""}`);
  }

  return (
    <SearchBar
      categories={categories}
      tags={tags}
      initialFilters={initialFilters}
      onChange={handleChange}
      placeholder="Buscar documentos, editais, políticas…"
    />
  );
}
