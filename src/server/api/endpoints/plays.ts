import { Plays } from '@/src/server/core/Plays';
import { Media } from '@/src/server/media/Media';
import { parsePagination } from '@/src/server/utils';
import { Router } from 'express';


export const plays = Router();


plays.get( '/', ( req, res ) => {
  const { limit, offset } = parsePagination( req.query.limit, req.query.offset );
  res.json( Plays.listByUser( res.locals.user.id, limit, offset ).map( play => ( { ...play,
    media: Media.get( play.mediaId )
  } ) ) );
} );
