export function assertId ( id: number, label: string ) : void {
  if ( ! Number.isSafeInteger( id ) || id < 1 ) throw new Error( `Invalid ${ label } ID: ${ id }` );
}
