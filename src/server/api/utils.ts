import type { Request, Response } from 'express';


export function parseId ( value: string ) : number | null {
  const id = Number( value );
  return Number.isSafeInteger( id ) && id > 0 ? id : null;
}


export function assertMediaId ( req: Request, res: Response ) : number | undefined {
  const id = parseId( req.params.id as string );
  if ( id === null ) return void res.status( 400 ).json( { error: 'Invalid media ID' } );

  return id;
}
