import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchFiltersProps = {
  basePath: "/search/jobs" | "/search/resumes";
  initialQuery: string;
  initialCategory?: string;
  categories?: Array<{ id: number; title: string }>;
};

export default function SearchFilters({ basePath, initialQuery, initialCategory = "", categories = [] }: SearchFiltersProps) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const inputId = basePath === "/search/jobs" ? "job-search-query" : "resume-search-query";
  const categoryId = "job-search-category";

  function onSubmit(event: { preventDefault(): void }) {
    event.preventDefault();

    const url = new URL(basePath, window.location.origin);
    if (query.trim()) {
      url.searchParams.set("q", query.trim());
    }
    if (basePath === "/search/jobs" && category.trim()) {
      url.searchParams.set("category", category.trim());
    }
    url.searchParams.set("page", "1");

    window.location.href = `${url.pathname}${url.search}`;
  }

  return (
    <form className="mt-4 flex flex-col gap-2 md:flex-row" onSubmit={onSubmit}>
      <label htmlFor={inputId} className="sr-only">
        Search query
      </label>
      <Input
        id={inputId}
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Try: React, Product, Europe..."
        className="h-10 w-full rounded-xl bg-card px-4 py-2.5 shadow-sm"
      />
      {basePath === "/search/jobs" ? (
        <>
          <label htmlFor={categoryId} className="sr-only">
            Job category
          </label>
          <select
            id={categoryId}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-10 rounded-xl border bg-card px-3 py-2 text-sm shadow-sm md:min-w-56"
          >
            <option value="">All categories</option>
            {categories.map((item) => (
              <option key={item.id} value={String(item.id)}>
                {item.title}
              </option>
            ))}
          </select>
        </>
      ) : null}
      <Button type="submit" size="lg" className="rounded-xl px-5 shadow-sm">
        Apply Filters
      </Button>
    </form>
  );
}
