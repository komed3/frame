import { parseId, parsePagination } from '@/src/server/api/utils';
import { Markers } from '@/src/server/core/Markers';
import type { MarkerUpdate } from '@/src/shared/types/markers';
import type { RequestParamHandler } from 'express';
import { Router } from 'express';


export const markers = Router();


markers.param( 'id', ( _, res, next, value ) => {
  const id = parseId( value );
  if ( id === null ) return res.status( 400 ).json( { error: 'Invalid marker ID' } );

  const marker = Markers.get( res.locals.user.id, id );
  if ( ! marker ) return res.status( 404 ).json( { error: 'Marker not found' } );

  res.locals.markerId = id;
  res.locals.marker = marker;
  next();
} );

markers.get( '/', ( req, res ) => {
  const pagination = parsePagination( req.query.limit, req.query.offset );
  if ( ! pagination ) return res.status( 400 ).json( { error: 'Invalid pagination options' } );

  res.json( Markers.list( res.locals.user.id, pagination.limit, pagination.offset ) );
} );

markers.get( '/:id', ( _, res ) => res.json( res.locals.marker ) );
