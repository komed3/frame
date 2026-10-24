import { resolveId } from '@/src/maintenance/utils/parse';
import { ui } from '@/src/maintenance/utils/ui';
import { MediaMetadata } from '@/src/server/media/Metadata';
import { validateEnum } from '@/src/server/utils';
import type { MediaMetadataSource } from '@/src/shared/types/metadata';
import { Command } from 'commander';


const resolveSource = ( value?: string ) : MediaMetadataSource =>
  validateEnum( value ?? 'manual', 'metadata source', [ 'manual', 'scan' ] );


export const registerMetadataCommands = ( program: Command ) : void => {
  const metadataCommand = program
    .command( 'metadata' ).alias( 'meta' )
    .description( 'Manage manual media metadata' );

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

  metadataCommand
    .command( 'get <media> <key>' )
    .description( 'Get one metadata value' )
    .option( '--source <source>', 'Metadata source: manual or scan', 'manual' )
    .action( ( media: string, key: string, options: { source: string } ) => {
      const entry = MediaMetadata.get( resolveId( media, 'media' ), key, resolveSource( options.source ) );
      if ( ! entry ) throw new Error( `Metadata key does not exist: ${ key }` );

      for ( const [ name, value ] of Object.entries( entry ) )
        console.log( `${ ui.key( name ) }: ${ ui.value( String( value ) ) }` );
    } );

  metadataCommand
    .command( 'set <media> <key> <value>' )
    .description( 'Set a manual metadata value' )
    .action( ( media: string, key: string, value: string ) => {
      const id = MediaMetadata.set( resolveId( media, 'media' ), key, value, 'manual' );
      ui.success( `Saved manual metadata ${ key } (ID ${ id }).` );
    } );

  metadataCommand
    .command( 'delete <media> <key>' )
    .description( 'Delete a manual metadata value' )
    .action( ( media: string, key: string ) => {
      MediaMetadata.delete( resolveId( media, 'media' ), key, 'manual' );
      ui.success( `Deleted manual metadata ${ key }.` );
    } );
}
