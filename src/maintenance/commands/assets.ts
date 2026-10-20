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

  assetCommand
    .command( 'get <media> <kind> [variant]' )
    .description( 'Show one asset by kind and optional variant' )
    .action( ( media: string, kind: string, variant = 'default' ) => {
      const asset = MediaAssets.get( resolveId( media, 'media' ), resolveKind( kind ), variant );
      if ( ! asset ) throw new Error( `Asset ${ kind }/${ variant } does not exist for media ${ media }` );

      for ( const [ key, value ] of Object.entries( asset ) ) console.log( `${ ui.key( key ) }: ${ ui.value(
        value === null ? '—' : typeof value === 'object' ? JSON.stringify( value ) : String( value )
      ) }` );
    } );
}
