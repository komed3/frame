import { assertMediaId } from '@/src/server/api/middleware';
import { ASSET_KINDS, MediaAssets } from '@/src/server/media/Assets';
import type { MediaAssetKind } from '@/src/shared/types/assets';
import { type RequestHandler, Router } from 'express';


export const assets = Router();
assets.param( 'id', assertMediaId );


const sendAsset: RequestHandler = ( req, res, next ) => {
  const { kind, variant = 'default' } = req.params as Record< string, string >;

  if ( ! ASSET_KINDS.includes( kind as MediaAssetKind ) )
    return res.status( 400 ).json( { error: 'Invalid asset kind' } );

  const asset = MediaAssets.get( res.locals.mediaId, kind as MediaAssetKind, variant );
  if ( ! asset ) return res.status( 404 ).json( { error: 'Asset not found' } );

  res.setHeader( 'Content-Type', asset.mimeType ?? 'application/octet-stream' );
  res.setHeader( 'Cache-Control', 'private, max-age=3600' );

  res.sendFile( MediaAssets.resolvePath( asset.path ), err => { if ( err ) next( err ) } );
};


assets.get( '/:id', ( _, res ) => res.json( MediaAssets.list( res.locals.mediaId ).map(
  ( { path, ...asset } ) => ( { ...asset, url: `/api/media/${ res.locals.mediaId }/assets/${ asset.kind }/${
    encodeURIComponent( asset.variant )
  }` } )
) ) );

assets.get( '/:id/:kind', sendAsset );
assets.get( '/:id/:kind/:variant', sendAsset );
