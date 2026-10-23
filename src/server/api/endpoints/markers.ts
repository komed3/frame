import { parseId, parsePagination } from '@/src/server/api/utils';
import { Markers } from '@/src/server/core/Markers';
import type { MarkerUpdate } from '@/src/shared/types/markers';
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

markers.patch( '/:id', ( req, res ) => {
  const body = req.body ?? {}, patch: MarkerUpdate = {};

  if ( body.positionMs !== undefined ) {
    if ( ! Number.isSafeInteger( body.positionMs ) || body.positionMs < 0 )
      return res.status( 400 ).json( { error: 'positionMs must be a non-negative integer' } );

    patch.positionMs = body.positionMs;
  }

  for ( const key of [ 'title', 'description' ] as const ) {
    const value = body[ key ];

    if ( value === undefined ) continue;
    if ( value !== null && typeof value !== 'string' )
      return res.status( 400 ).json( { error: `${ key } must be a string or null` } );

    patch[ key ] = value;
  }

  if ( ! Object.keys( patch ).length ) return res.status( 400 ).json( { error: 'No marker fields provided' } );

  Markers.update( res.locals.user.id, res.locals.markerId, patch );
  res.json( Markers.get( res.locals.user.id, res.locals.markerId ) );
} );

markers.delete( '/:id', ( _, res ) => {
  Markers.delete( res.locals.user.id, res.locals.markerId );
  res.status( 204 ).end();
} );
