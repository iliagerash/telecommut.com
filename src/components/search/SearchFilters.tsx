import { useState } from "react";

type SearchFiltersProps = {
  basePath: "/search/jobs" | "/search/resumes";
  initialQuery: string;
};

export default function SearchFilters({ basePath, initialQuery }: SearchFiltersProps) {
  const [query, setQuery] = useState(initialQuery);

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
      <input
        aria-label="Search query"
        className="w-full rounded-xl border bg-card px-4 py-2.5 text-sm shadow-sm"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Try: React, Product, Europe..."
      />
      <button
        className="rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:opacity-90"
        type="submit"
      >
        Apply Filters
      </button>
    </form>
  );
}
