import { MediaAssets } from '@/src/server/media/Assets';
import type { MediaAssetKind } from '@/src/shared/types/assets';
import { type RequestHandler, Router } from 'express';


export const assets = Router();


const sendAsset: RequestHandler = ( req, res, next ) => {
  const asset = MediaAssets.get(
    req.params.id as string, req.params.kind as MediaAssetKind,
    req.params.variant as string ?? 'default'
  );

  if ( ! asset ) return res.status( 404 ).json( { error: 'Asset not found' } );

  res.setHeader( 'Content-Type', asset.mimeType ?? 'application/octet-stream' );
  res.setHeader( 'Cache-Control', 'private, max-age=3600' );
  res.sendFile( MediaAssets.resolvePath( asset.path ), err => { if ( err ) next( err ) } );
};


assets.get( '/:id', ( req, res ) => res.json( MediaAssets.list( req.params.id ).map(
  ( { path, ...asset } ) => ( { ...asset, url:
    `/api/assets/${ req.params.id }/${ asset.kind }/${ encodeURIComponent( asset.variant ) }`
  } )
) ) );

assets.get( '/:id/:kind', sendAsset );
assets.get( '/:id/:kind/:variant', sendAsset );
