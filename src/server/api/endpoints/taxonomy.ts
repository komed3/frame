import { parseId } from '@/src/server/api/utils';
import { MediaTaxonomy } from '@/src/server/media/Taxonomy';
import type { RequestParamHandler } from 'express';
import { Router } from 'express';


export const tags = Router();
export const categories = Router();


const assertTagId: RequestParamHandler = ( _, res, next, value ) => {
  const id = parseId( value );
  if ( id === null ) return res.status( 400 ).json( { error: 'Invalid tag ID' } );

  const tag = MediaTaxonomy.getTag( id );
  if ( ! tag ) return res.status( 404 ).json( { error: 'Tag not found' } );

  res.locals.tagId = id;
  res.locals.tag = tag;
  next();
};

const assertCategoryId: RequestParamHandler = ( _, res, next, value ) => {
  const id = parseId( value );
  if ( id === null ) return res.status( 400 ).json( { error: 'Invalid category ID' } );

  const category = MediaTaxonomy.getCategory( id );
  if ( ! category ) return res.status( 404 ).json( { error: 'Category not found' } );

  res.locals.categoryId = id;
  res.locals.category = category;
  next();
};


// --- tags ---

tags.param( 'id', assertTagId );
tags.get( '/', ( _, res ) => res.json( MediaTaxonomy.listTags() ) );
