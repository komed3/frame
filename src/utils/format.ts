export function formatBytes ( bytes: number | null | undefined ) : string {
  if ( bytes === null || bytes === undefined || ! Number.isFinite( bytes ) || bytes < 0 ) return '—';
  if ( bytes === 0 ) return '0 B';

  const units = [ 'B', 'KiB', 'MiB', 'GiB', 'TiB' ];
  const index = Math.min( Math.floor( Math.log( bytes ) / Math.log( 1024 ) ), units.length - 1 );
  const value = bytes / 1024 ** index;

  return `${ new Intl.NumberFormat( undefined, {
    maximumFractionDigits: index === 0 ? 0 : 1
  } ).format( value ) } ${ units[ index ] }`;
}
