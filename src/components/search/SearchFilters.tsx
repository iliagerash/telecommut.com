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
    <form className="mt-4 flex gap-2" onSubmit={onSubmit}>
      <input
        className="w-full rounded-md border px-3 py-2 text-sm"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search..."
      />
      <button className="rounded-md border px-3 py-2 text-sm" type="submit">
        Search
      </button>
    </form>
  );
}
