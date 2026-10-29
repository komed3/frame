import { Markers } from '@/src/server/core/Markers';
import { parsePagination } from '@/src/server/utils';
import type { MarkerUpdate } from '@/src/shared/types/markers';
import { Router } from 'express';


export const markers = Router();


markers.get( '/', ( req, res ) => {
  const pagination = parsePagination( req.query.limit, req.query.offset );
  res.json( Markers.list( res.locals.user.id, pagination.limit, pagination.offset ) );
} );

markers.get< { id: string } >( '/:id', ( req, res ) => res.json( Markers.get( res.locals.user.id, req.params.id ) ) );

markers.patch< { id: string } >( '/:id', ( req, res ) => {
  Markers.update( res.locals.user.id, req.params.id, req.body as MarkerUpdate );
  res.json( Markers.get( res.locals.user.id, req.params.id ) );
} );

markers.delete< { id: string } >( '/:id', ( req, res ) => {
  Markers.delete( res.locals.user.id, req.params.id );
  res.status( 204 ).end();
} );
