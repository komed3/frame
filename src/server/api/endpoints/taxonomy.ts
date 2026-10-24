import { MediaTaxonomy } from '@/src/server/media/Taxonomy';
import { Router } from 'express';


export const tags = Router();
export const categories = Router();


tags.get( '/', ( _, res ) => res.json( MediaTaxonomy.listTags() ) );
tags.get( '/:id', ( req, res ) => res.json( MediaTaxonomy.getTag( req.params.id ) ) );

tags.post( '/', ( req, res ) => {
  const id = MediaTaxonomy.createTag( req.body?.name );
  res.status( 201 ).json( MediaTaxonomy.getTag( id ) );
} );

tags.patch( '/:id', ( req, res ) => {
  MediaTaxonomy.renameTag( req.params.id, req.body?.name );
  res.json( MediaTaxonomy.getTag( req.params.id ) );
} );

tags.delete( '/:id', ( req, res ) => {
  MediaTaxonomy.deleteTag( req.params.id );
  res.status( 204 ).end();
} );


categories.get( '/', ( _, res ) => res.json( MediaTaxonomy.listCategories() ) );
categories.get( '/:id', ( req, res ) => res.json( MediaTaxonomy.getCategory( req.params.id ) ) );

categories.post( '/', ( req, res ) => {
  const id = MediaTaxonomy.createCategory( req.body?.name, req.body?.parentId ?? null );
  res.status( 201 ).json( MediaTaxonomy.getCategory( id ) );
} );

categories.patch( '/:id', ( req, res ) => {
  MediaTaxonomy.renameCategory( req.params.id, req.body?.name );
  res.json( MediaTaxonomy.getCategory( req.params.id ) );
} );

categories.put( '/:id/parent', ( req, res ) => {
  MediaTaxonomy.setCategoryParent( req.params.id, req.body?.parentId );
  res.json( MediaTaxonomy.getCategory( req.params.id ) );
} );

categories.delete( '/:id', ( req, res ) => {
  MediaTaxonomy.deleteCategory( req.params.id );
  res.status( 204 ).end();
} );
