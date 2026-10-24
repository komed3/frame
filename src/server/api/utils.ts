export function parseId ( value: string ) : number | null {
  const id = Number( value );
  return Number.isSafeInteger( id ) && id > 0 ? id : null;
}


export function parsePagination ( limit: unknown, offset: unknown ) : { limit: number; offset: number } | null {
  return { limit: limit === undefined ? 100 : Number( limit ), offset: offset === undefined ? 0 : Number( offset ) };
}
