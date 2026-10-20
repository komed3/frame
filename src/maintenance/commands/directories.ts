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
    .command( 'directory' ).alias( 'dir' )
    .description( 'Inspect media directories' );

  directoryCommand
    .command( 'list <root>' )
    .description( 'List directories in a media root' )
    .action( ( root: string ) => {
      const directories = MediaDirectories.list( resolveId( root, 'media root' ) );
      if ( ! directories.length ) return ui.info( 'No directories found.' );

      console.table( directories );
    } );

  directoryCommand
    .command( 'get <id>' )
    .description( 'Show directory details' )
    .action( ( id: string ) => {
      const directory = MediaDirectories.get( resolveId( id, 'media directory' ) );
      if ( ! directory ) throw new Error( `Media directory ${ id } does not exist` );

      for ( const [ key, value ] of Object.entries( directory ) )
        console.log( `${ ui.key( key )}: ${ ui.value( value === null ? '—' : String( value ) ) }` );
    } );

  directoryCommand
    .command( 'tree <root>' )
    .description( 'Show the directory tree' )
    .action( ( root: string ) => {
      const tree = MediaDirectories.tree( resolveId( root, 'media root' ) );
      if ( ! tree.length ) return ui.info( 'No directories found.' );

      printTree( tree );
    } );
}
