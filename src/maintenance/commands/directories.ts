import { ui } from '@/src/maintenance/utils/ui';
import { MediaDirectories } from '@/src/server/media/Directories';
import { resolveId } from '@/src/server/utils';
import type { MediaDirectoryTree } from '@/src/shared/types/directories';
import { Command } from 'commander';


const printTree = ( nodes: MediaDirectoryTree[], prefix = '' ) : void => {
  nodes.forEach( ( { name, id, mediaCount, children }, i ) => {
    const last = i === nodes.length - 1, branch = last ? '└── ' : '├── ';
    ui.info( `${ prefix }${ branch }${ name } [${ id }] (${ mediaCount })` );

    if ( children.length ) printTree( children, `${ prefix }${ last ? '    ' : '│   ' }` );
  } );
};


export const registerDirectoryCommands = ( program: Command ) : void => {
  const directoryCommand = program
    .command( 'directory' )
    .description( 'Inspect media directories' );
}
