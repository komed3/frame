import { ui } from '@/src/maintenance/utils/ui';
import { MediaMetadata } from '@/src/server/media/Metadata';
import { resolveId, validateEnum } from '@/src/server/utils';
import type { MediaMetadataSource } from '@/src/shared/types/metadata';
import { Command } from 'commander';


const resolveSource = ( value?: string ) : MediaMetadataSource =>
  validateEnum( value ?? 'manual', 'metadata source', [ 'manual', 'scan' ] );


export const registerMetadataCommands = ( program: Command ) : void => {
  const metadataCommand = program
    .command( 'metadata' )
    .alias( 'meta' )
    .description( 'Manage media metadata' );

  metadataCommand
    .command( 'list <media>' )
    .description( 'List metadata for a media record' )
    .option( '--source <source>', 'Filter by source: manual or scan' )
    .action( ( media: string, options: { source?: string } ) => {
      const entries = MediaMetadata.list( resolveId( media, 'media' ),
        options.source === undefined ? undefined : resolveSource( options.source )
      );

      if ( ! entries.length ) return ui.info( 'No metadata found.' );
      console.table( entries );
    } );
}
