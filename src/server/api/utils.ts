export function parsePagination ( limit: unknown, offset: unknown ) : { limit: number; offset: number } {
  return { limit: limit === undefined ? 100 : Number( limit ), offset: offset === undefined ? 0 : Number( offset ) };
}
