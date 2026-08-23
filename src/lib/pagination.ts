export interface PageParams {
  page: number;
  limit: number;
}

export function parsePagination(query: {
  page?: unknown;
  limit?: unknown;
}): PageParams {
  const page = Math.max(1, Number(query.page) || 1);
  
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  return { page, limit };
}

export function toSkipTake({ page, limit }: PageParams) {
  return { skip: (page - 1) * limit, take: limit };
}

export function buildPage<T>(data: T[], total: number, { page, limit }: PageParams) {
  return { data, total, page, limit };
}