import { Favorites } from '@/src/server/core/Favorites';
import { parsePagination } from '@/src/server/utils';
import { Router } from 'express';


export const favorites = Router();


favorites.get( '/', ( req, res ) => {
  const pagination = parsePagination( req.query.limit, req.query.offset );
  res.json( Favorites.list( res.locals.user.id, pagination.limit, pagination.offset ) );
} );

favorites.get< { mediaId: string } >( '/:mediaId', ( req, res ) => res.json( {
  favorite: Favorites.has( res.locals.user.id, req.params.mediaId )
} ) );

favorites.post< { mediaId: string } >( '/:mediaId', ( req, res ) => res.json( {
  favorite: true, added: Favorites.add( res.locals.user.id, req.params.mediaId )
} ) );

favorites.delete< { mediaId: string } >( '/:mediaId', ( req, res ) => {
  Favorites.remove( res.locals.user.id, req.params.mediaId );
  res.status( 204 ).end();
} );
