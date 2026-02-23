export type PaginationState = {
  page: number;
  pageSize: number;
  offset: number;
};

export function parsePageParam(value: string | null | undefined): number {
  if (!value) {
    return 1;
  }

  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed < 1) {
    return 1;
  }

  return parsed;
}

export function buildPaginationState(pageParam: string | null | undefined, pageSize = 20): PaginationState {
  const page = parsePageParam(pageParam);
  return {
    page,
    pageSize,
    offset: (page - 1) * pageSize,
  };
}
