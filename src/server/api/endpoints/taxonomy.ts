import { parseId } from '@/src/server/api/utils';
import { MediaTaxonomy } from '@/src/server/media/Taxonomy';
import { Router } from 'express';


// --- tags ---

export const tags = Router();


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
  const { name } = req.body ?? {};
  if ( typeof name !== 'string' ) return res.status( 400 ).json( { error: 'Tag name is required' } );

  const id = MediaTaxonomy.createTag( name );
  res.json( MediaTaxonomy.getTag( id ) );
} );

tags.patch( '/:id', ( req, res ) => {
  const { name } = req.body ?? {};
  if ( typeof name !== 'string' ) return res.status( 400 ).json( { error: 'Tag name is required' } );

  MediaTaxonomy.renameTag( res.locals.tagId, name );
  res.json( MediaTaxonomy.getTag( res.locals.tagId ) );
} );

tags.delete( '/:id', ( _, res ) => {
  MediaTaxonomy.deleteTag( res.locals.tagId );
  res.status( 204 ).end();
} );


// --- categories ---

export const categories = Router();


categories.param( 'id', ( _, res, next, value ) => {
  const id = parseId( value );
  if ( id === null ) return res.status( 400 ).json( { error: 'Invalid category ID' } );

  const category = MediaTaxonomy.getCategory( id );
  if ( ! category ) return res.status( 404 ).json( { error: 'Category not found' } );

  res.locals.categoryId = id;
  res.locals.category = category;
  next();
} );

categories.get( '/', ( _, res ) => res.json( MediaTaxonomy.listCategories() ) );

categories.post( '/', ( req, res ) => {
  const { name, parentId = null } = req.body ?? {};

  if ( typeof name !== 'string' )
    return res.status( 400 ).json( { error: 'Category name is required' } );

  if ( parentId !== null && ( typeof parentId !== 'number' || ! Number.isSafeInteger( parentId ) || parentId < 1 ) )
    return res.status( 400 ).json( { error: 'Invalid parent category ID' } );

  if ( parentId !== null && ! MediaTaxonomy.getCategory( parentId ) )
    return res.status( 404 ).json( { error: 'Parent category not found' } );

  const id = MediaTaxonomy.createCategory( name, parentId );
  res.json( MediaTaxonomy.getCategory( id ) );
} );
