import { assertMediaId } from '@/src/server/api/middleware';
import { MediaAssets } from '@/src/server/media/Assets';
import type { MediaAssetKind } from '@/src/shared/types/assets';
import { type RequestHandler, Router } from 'express';


export const assets = Router();
assets.param( 'id', assertMediaId );


const sendAsset: RequestHandler = ( req, res, next ) => {
  const asset = MediaAssets.get(
    res.locals.mediaId, req.params.kind as MediaAssetKind,
    req.params.variant as string ?? 'default'
  );

  if ( ! asset ) return res.status( 404 ).json( { error: 'Asset not found' } );

  res.setHeader( 'Content-Type', asset.mimeType ?? 'application/octet-stream' );
  res.setHeader( 'Cache-Control', 'private, max-age=3600' );
  res.sendFile( MediaAssets.resolvePath( asset.path ), err => { if ( err ) next( err ) } );
};


assets.get( '/:id', ( _, res ) => res.json( MediaAssets.list( res.locals.mediaId ).map(
  ( { path, ...asset } ) => ( { ...asset, url:
    `/api/assets/${ res.locals.mediaId }/${ asset.kind }/${ encodeURIComponent( asset.variant ) }`
  } )
) ) );

assets.get( '/:id/:kind', sendAsset );
assets.get( '/:id/:kind/:variant', sendAsset );
