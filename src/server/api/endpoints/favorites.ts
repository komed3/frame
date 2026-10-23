import { assertMediaId } from '@/src/server/api/middleware';
import { parsePagination } from '@/src/server/api/utils';
import { Favorites } from '@/src/server/core/Favorites';
import { Router } from 'express';


export const favorites = Router();
favorites.param( 'mediaId', assertMediaId );


favorites.get( '/', ( req, res ) => {
  const pagination = parsePagination( req.query.limit, req.query.offset );
  if ( ! pagination ) return res.status( 400 ).json( { error: 'Invalid pagination options' } );

  res.json( Favorites.list( res.locals.user.id, pagination.limit, pagination.offset ) );
} );
