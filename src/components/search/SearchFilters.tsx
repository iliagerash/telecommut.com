import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type SearchFiltersProps = {
  basePath: "/search/jobs" | "/search/resumes";
  initialQuery: string;
};

export default function SearchFilters({ basePath, initialQuery }: SearchFiltersProps) {
  const [query, setQuery] = useState(initialQuery);
  const inputId = basePath === "/search/jobs" ? "job-search-query" : "resume-search-query";

  function onSubmit(event: { preventDefault(): void }) {
    event.preventDefault();

    const url = new URL(basePath, window.location.origin);
    if (query.trim()) {
      url.searchParams.set("q", query.trim());
    }
    url.searchParams.set("page", "1");

    window.location.href = `${url.pathname}${url.search}`;
  }

  return (
    <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={onSubmit}>
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
      <Button type="submit" size="lg" className="rounded-xl px-5 shadow-sm">
        Apply Filters
      </Button>
    </form>
  );
}
