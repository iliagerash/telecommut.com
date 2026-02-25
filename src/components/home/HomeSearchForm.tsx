import { useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";

import { Button } from "@/components/ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type CategoryOption = {
  id: number;
  title: string;
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
        const response = await fetch(`/autocomplete/position?term=${encodeURIComponent(trimmedQuery)}`);
        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as unknown;
        if (current !== requestSeq.current || !Array.isArray(payload)) {
          return;
        }

        const nextSuggestions = payload.filter((item): item is string => typeof item === "string");
        setSuggestions(nextSuggestions);
        setOpen(nextSuggestions.length > 0);
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

    const url = new URL("/search/jobs", window.location.origin);
    if (trimmedQuery) {
      url.searchParams.set("q", trimmedQuery);
    }
    if (category) {
      url.searchParams.set("category", category);
    }
    window.location.href = `${url.pathname}${url.search}`;
  };

  return (
    <form className="mt-6 grid gap-3 md:grid-cols-[1fr_220px_auto]" onSubmit={submitSearch}>
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) {
            setOpen(false);
            return;
          }

          if (trimmedQuery.length >= 3 && suggestions.length > 0) {
            setOpen(true);
          }
        }}
      >
        <PopoverTrigger asChild>
          <div>
            <Input
              id="position"
              name="q"
              value={query}
              placeholder="Position, skill, or company"
              aria-label="Search position"
              autoComplete="off"
              className="h-11 rounded-xl bg-background px-3 text-sm"
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => {
                if (trimmedQuery.length >= 3 && suggestions.length > 0) {
                  setOpen(true);
                }
              }}
            />
          </div>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          sideOffset={4}
          className="w-[var(--radix-popover-trigger-width)] p-0"
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Command>
            <CommandList>
              {isLoading ? <CommandEmpty>Loading suggestions...</CommandEmpty> : null}
              {!isLoading && suggestions.length === 0 ? <CommandEmpty>No matches found.</CommandEmpty> : null}
              <CommandGroup>
                {suggestions.map((item) => (
                  <CommandItem
                    key={item}
                    value={item}
                    className="cursor-pointer"
                    onSelect={(value) => {
                      setQuery(value);
                      setOpen(false);
                    }}
                  >
                    {item}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <Select value={category || "__all__"} onValueChange={(value) => setCategory(value === "__all__" ? "" : value)}>
        <SelectTrigger className="!h-11 w-full rounded-xl border bg-background px-3 py-0 text-sm shadow-none">
          <SelectValue placeholder="All Categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__" className="cursor-pointer">
            All Categories
          </SelectItem>
          {categoryOptions.map((row) => (
            <SelectItem key={row.id} value={String(row.id)} className="cursor-pointer">
              {row.title}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button type="submit" className="h-11 rounded-xl px-5 text-sm font-semibold">
        Find Jobs
      </Button>
    </form>
  );
}
