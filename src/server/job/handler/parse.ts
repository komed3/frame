export function parseNumber ( value: string | number | undefined ) : number | null {
  if ( value === undefined || value === '' ) return null;

  const parsed = Number( value );
  return Number.isFinite( parsed ) ? parsed : null;
}


export function parsePositive ( value: string | number | undefined ) : number | null {
  const parsed = parseNumber( value );
  return parsed !== null && parsed > 0 ? parsed : null;
}


export function parseRate ( value?: string ) : Number | null {
  if ( ! value ) return null;

  const [ numerator, denominator ] = value.split( '/' ).map( Number );
  if ( ! denominator || ! Number.isFinite( numerator ) || ! Number.isFinite( denominator ) ) return null;

  const rate = numerator / denominator;
  return Number.isFinite( rate ) && rate > 0 ? rate : null;
}
