import { parseId } from '@/src/server/api/utils';
import { MediaTaxonomy } from '@/src/server/media/Taxonomy';
import { Router } from 'express';


export const tags = Router();
export const categories = Router();


tags.param( 'id', ( _, res, next, value ) => {
  const id = parseId( value );
  if ( id === null ) return res.status( 400 ).json( { error: 'Invalid tag ID' } );

  const tag = MediaTaxonomy.getTag( id );
  if ( ! tag ) return res.status( 404 ).json( { error: 'Tag not found' } );

  res.locals.tagId = id;
  res.locals.tag = tag;
  next();
} );

tags.get( '/', ( _, res ) => res.json( MediaTaxonomy.listTags() ) );
tags.get( '/:id', ( _, res ) => res.json( res.locals.tag ) );

tags.post( '/', ( req, res ) => {
  const id = MediaTaxonomy.createTag( req.body?.name );
  res.status( 201 ).json( MediaTaxonomy.getTag( id ) );
} );

tags.patch( '/:id', ( req, res ) => {
  MediaTaxonomy.renameTag( res.locals.tagId, req.body?.name );
  res.json( MediaTaxonomy.getTag( res.locals.tagId ) );
} );

tags.delete( '/:id', ( _, res ) => {
  MediaTaxonomy.deleteTag( res.locals.tagId );
  res.status( 204 ).end();
} );
