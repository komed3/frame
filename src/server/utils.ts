export function assertId ( id: number, label: string ) : void {
  if ( ! Number.isSafeInteger( id ) || id < 1 ) throw new Error( `Invalid ${ label } ID: ${ id }` );
}


export function assertRelativePath ( path: string, label: string ) : void {
  if (
    typeof path !== 'string' || ! path || path.includes( '\0' ) || path.includes( '\\' ) ||
    path.startsWith( '/' ) || path.split( '/' ).some( part => ! part || part === '.' || part === '..' )
  ) throw new Error( `Invalid relative ${ label } path: ${ path }` );
}
