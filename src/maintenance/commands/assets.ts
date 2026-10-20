import { ui } from '@/src/maintenance/utils/ui';
import { ASSET_KINDS, MediaAssets } from '@/src/server/media/Assets';
import { resolveId, validateEnum } from '@/src/server/utils';
import type { MediaAssetKind } from '@/src/shared/types/assets';
import { Command } from 'commander';


const resolveKind = ( value: string ) : MediaAssetKind => validateEnum( value, 'asset kind', ASSET_KINDS );


export const registerAssetCommands = ( program: Command ) : void => {
  const assetCommand = program
    .command( 'asset' )
    .alias( 'assets' )
    .description( 'Inspect generated media assets' );

  assetCommand
    .command( 'list <media>' )
    .description( 'List generated assets for a media record' )
    .option( '--kind <kind>', 'Filter by asset kind' )
    .action( ( media: string, options: { kind?: string } ) => {
      const assets = MediaAssets.list( resolveId( media, 'media' ),
        options.kind === undefined ? undefined : resolveKind( options.kind )
      );

      if ( ! assets.length ) return ui.info( 'No assets found.' );
      console.table( assets );
    } );
}
