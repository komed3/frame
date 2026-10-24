import { assertMarkerId } from '@/src/server/api/middleware';
import { parsePagination } from '@/src/server/api/utils';
import { Markers } from '@/src/server/core/Markers';
import type { MarkerUpdate } from '@/src/shared/types/markers';
import { Router } from 'express';


export const markers = Router();
markers.param( 'id', assertMarkerId );


markers.get( '/', ( req, res ) => {
  const pagination = parsePagination( req.query.limit, req.query.offset );
  if ( ! pagination ) return res.status( 400 ).json( { error: 'Invalid pagination options' } );

  res.json( Markers.list( res.locals.user.id, pagination.limit, pagination.offset ) );
} );

markers.get( '/:id', ( _, res ) => res.json( res.locals.marker ) );

markers.patch( '/:id', ( req, res ) => {
  Markers.update( res.locals.user.id, res.locals.markerId, req.body as MarkerUpdate );
  res.json( Markers.get( res.locals.user.id, res.locals.markerId ) );
} );

markers.delete( '/:id', ( _, res ) => {
  Markers.delete( res.locals.user.id, res.locals.markerId );
  res.status( 204 ).end();
} );
