import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";

type CategoryOption = {
  id: number;
  title: string;
  slug?: string | null;
};

type HomeSearchFormProps = {
  initialQuery: string;
  initialCategory: string;
  categoryOptions: CategoryOption[];
};

export default function HomeSearchForm({ initialQuery, initialCategory, categoryOptions }: HomeSearchFormProps) {
  const [query, setQuery] = useState(initialQuery);
  const [category, setCategory] = useState(initialCategory);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const requestSeq = useRef(0);

  const trimmedQuery = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (trimmedQuery.length < 3) {
      setSuggestions([]);
      setOpen(false);
      return;
    }

    setIsLoading(true);
    const current = ++requestSeq.current;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/autocomplete/position?term=${encodeURIComponent(trimmedQuery)}&type=jobs`);
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as unknown;
        if (current !== requestSeq.current || !Array.isArray(payload)) {
          return;
        }

        const nextSuggestions = payload.filter((item): item is string => typeof item === "string");
        setSuggestions(nextSuggestions);
        setOpen((currentOpen) => currentOpen && nextSuggestions.length > 0);
      } finally {
        if (current === requestSeq.current) {
          setIsLoading(false);
        }
      }
    }, 180);

    return () => window.clearTimeout(timer);
  }, [trimmedQuery]);

  const submitSearch: NonNullable<ComponentProps<"form">["onSubmit"]> = (event) => {
    event.preventDefault();

    if (!trimmedQuery && category) {
      const selected = categoryOptions.find((row) => String(row.id) === category);
      const categorySegment = selected?.slug?.trim();
      if (categorySegment) {
        window.location.href = `/categories/${encodeURIComponent(categorySegment)}`;
        return;
      }
    }

    const url = new URL("/jobs", window.location.origin);
    if (trimmedQuery) {
      url.searchParams.set("position", trimmedQuery);
    }
    if (category) {
      url.searchParams.set("category_id", category);
    }
    window.location.href = `${url.pathname}${url.search}`;
  };

  return (
    <form className="relative z-40 mt-6 grid gap-3 md:grid-cols-[1fr_220px_auto]" onSubmit={submitSearch}>
      <div className="relative">
        <label className="sr-only" htmlFor="position">
          Search position
        </label>
        <input
          id="position"
          name="position"
          value={query}
          placeholder="Position"
          aria-label="Search position"
          autoComplete="off"
          className="h-11 w-full rounded-xl border bg-background px-3 text-sm"
          onChange={(event) => {
            const nextValue = event.target.value;
            setQuery(nextValue);
            setOpen(nextValue.trim().length >= 3);
          }}
          onFocus={() => {
            if (trimmedQuery.length >= 3 && suggestions.length > 0) {
              setOpen(true);
            }
          }}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 120);
          }}
        />
        {open ? (
          <ul className="absolute z-[200] mt-1 max-h-72 w-full overflow-auto rounded-xl border bg-popover p-1 shadow-md">
            {isLoading ? <li className="px-3 py-2 text-sm text-muted-foreground">Loading suggestions...</li> : null}
            {!isLoading && suggestions.length === 0 ? (
              <li className="px-3 py-2 text-sm text-muted-foreground">No matches found.</li>
            ) : null}
            {suggestions.map((item) => (
              <li key={item}>
                <button
                  type="button"
                  className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  onClick={() => {
                    setQuery(item);
                    setOpen(false);
                  }}
                >
                  {item}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      <div className="relative">
        <label className="sr-only" htmlFor="category_id">
          Category
        </label>
        <select
          id="category_id"
          name="category_id"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="h-11 w-full appearance-none rounded-xl border bg-background px-3 pr-9 text-sm"
        >
          <option value="">All Categories</option>
          {categoryOptions.map((row) => (
            <option key={row.id} value={String(row.id)}>
              {row.title}
            </option>
          ))}
        </select>
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground">▾</span>
      </div>

      <button
        type="submit"
        className="h-11 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground hover:opacity-90"
      >
        Find Jobs
      </button>
    </form>
  );
}
