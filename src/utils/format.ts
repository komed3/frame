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


export function formatDuration ( ms: number | null | undefined ) : string {
  if ( ms === null || ms === undefined || ! Number.isFinite( ms ) || ms < 0 ) return '—';
  const seconds = Math.floor( ms / 1000 );

  return [ Math.floor( seconds / 3600 ), Math.floor( seconds % 3600 / 60 ), seconds % 60 ].map(
    ( value, i ) => i > 0 || value > 0 ? String( value ).padStart( 2, '0' ) : null
  ).filter( Boolean ).join( ':' );
}


export function formatDimensions ( width: number | null | undefined, height: number | null | undefined ) : string {
  return width && height ? `${ width } × ${ height }` : '—';
}


export function formatDate ( value: string | null | undefined ) : string {
  if ( ! value ) return '—';

  const date = new Date( value );
  if ( Number.isNaN( date.getTime() ) ) return '—';

  return new Intl.DateTimeFormat( 'en-us', { dateStyle: 'medium' } ).format( date );
}


export function formatFileFormat ( fileName: string, container?: string | null ) : string {
  const extension = fileName.match( /\.([^.\/\\]+)$/ )?.[ 1 ];
  return extension ? extension.toUpperCase() : container?.split( ',' )[ 0 ].toUpperCase() ?? '—';
}


export function formatMediaType ( type: string ) : string {
  switch ( type ) {
    case 'video': return 'Video';
    case 'audio': return 'Audio';
    case 'image': return 'Image';
    case 'text': return 'Text';
    default: return 'File';
  }
}
