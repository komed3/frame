export function parseId ( value: string ) : number | null {
  const id = Number( value );
  return Number.isSafeInteger( id ) && id > 0 ? id : null;
}


export function parsePagination ( limit: unknown, offset: unknown ) : { limit: number; offset: number } | null {
  const l = limit === undefined ? 100 : typeof limit === 'string' ? Number( limit ) : NaN;
  const o = offset === undefined ? 0 : typeof offset === 'string' ? Number( offset ) : NaN;

  if ( ! Number.isSafeInteger( l ) || l < 1 || l > 500 ||
    ! Number.isSafeInteger( o ) || o < 0 ) return null;

  return { limit: l, offset: o };
}
