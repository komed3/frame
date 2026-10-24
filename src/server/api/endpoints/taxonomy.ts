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
