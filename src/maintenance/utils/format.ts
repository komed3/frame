import { validateNumber } from '@/src/server/utils';


export const parseNumber = ( value: string, label: string, min = 0 ) : number =>
  validateNumber( value, label, min, Number.MAX_SAFE_INTEGER, true, true );

export const formatValue = ( value: unknown ) : string => value === null ? '—'
  : typeof value === 'object' ? JSON.stringify( value )
  : String( value );
