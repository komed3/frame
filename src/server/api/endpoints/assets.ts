import { ASSET_KINDS, MediaAssets } from '@/src/server/media/Assets';
import type { MediaAssetKind } from '@/src/shared/types/assets';
import { Router, type NextFunction, type Response } from 'express';


export const assets = Router();


function sendAsset ( id: number, kind: string, variant: string, res: Response, next: NextFunction ) {
  if ( ! ASSET_KINDS.includes( kind as MediaAssetKind ) )
    return res.status( 400 ).json( { error: 'Invalid asset kind' } );

  const asset = MediaAssets.get( id, kind as MediaAssetKind, variant );
  if ( ! asset ) return res.status( 404 ).json( { error: 'Asset not found' } );

  res.setHeader( 'Content-Type', asset.mimeType ?? 'application/octet-stream' );
  res.setHeader( 'Cache-Control', 'private, max-age=3600' );

  res.sendFile( MediaAssets.resolvePath( asset.path ), err => { if ( err ) next( err ) } );
}
