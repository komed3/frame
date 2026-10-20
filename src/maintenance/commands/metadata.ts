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
}
