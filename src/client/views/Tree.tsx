import { Loading } from '@/src/client/components/Loading';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { ApiDirectoryTreeResult } from '@/src/shared/types/api';
import type { MediaDirectoryTree } from '@/src/shared/types/directories';
import type { MediaRoot } from '@/src/shared/types/roots';
import { ChevronRightIcon, FolderIcon } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';


interface RootTree {
  root: MediaRoot;
  name: string;
  tree: MediaDirectoryTree[];
}

interface DirectoryNodeProps {
  rootId: string;
  directory: MediaDirectoryTree;
  depth: number;
  expanded: Set< string >;
  onToggle: ( id: string ) => void;
  onNavigate: ( rootId: string, directoryId: string ) => void;
}


function rootName ( root: MediaRoot ) {
  return root.path.split( /[\\/]/ ).filter( Boolean ).pop() ?? root.path;
}


function DirectoryNode ( { rootId, directory, depth, expanded, onToggle, onNavigate }: DirectoryNodeProps ) {
  const open = expanded.has( directory.id ), hasChildren = directory.children.length > 0;

  return (
    <>
      <div
        className= 'flex items-center gap-2 min-h-10'
        style= { { paddingLeft: `${ depth * 1.25 }rem` } }
      >
        <button
          aria-label= { open ? 'Collapse folder' : 'Expand folder' }
          aria-expanded= { open }
          onClick= { () => onToggle( directory.id ) }
          disabled= { ! hasChildren }
          className= {
            'flex justify-center items-center size-6 shrink-0 rounded transition-all ' +
            ( hasChildren ? 'text-slate-400 hover:text-white hover:bg-slate-50/10' : 'invisible' ) +
            ( open && ' rotate-90' )
          }
        >
          <ChevronRightIcon size= { 16 } />
        </button>

        <button
          onClick= { () => onNavigate( rootId, directory.id ) }
          className= 'group flex-1 flex items-center gap-3 min-w-0 py-2 text-left'
        >
          <FolderIcon size= { 17 } className= 'shrink-0 text-slate-400' />

          <span className= 'truncate text-sm transition-colors group-hover:text-sky-400'>
            { directory.name }
          </span>

          <span className= 'shrink-0 ml-auto pr-3 text-xs text-slate-500 tabular-nums'>
            { directory.mediaCount }
          </span>
        </button>
      </div>

      { open && directory.children.map( child => (
        <DirectoryNode
          key= { child.id }
          rootId= { rootId }
          directory= { child }
          depth= { depth + 1 }
          expanded= { expanded }
          onToggle= { onToggle }
          onNavigate= { onNavigate }
        />
      ) ) }
    </>
  );
}


export function Tree () {
  const { roots, directories } = useApi();
  const navigate = useNavigate();

  const [ expanded, setExpanded ] = useState< Set< string > >( new Set() );
  const { data, loading, error } = useApiData< RootTree[] >( 'directory-tree', async () =>
    Promise.all( ( await roots.list() ).map( async root => {
      const result: ApiDirectoryTreeResult = await directories.tree( root.id );
      return { root, name: result.root.name ?? rootName( root ), tree: result.tree };
    } ) )
  );


  usePageTitle( 'Directories' );


  const toggle = ( id: string ) => setExpanded( current => {
    const next = new Set( current );

    if ( next.has( id ) ) next.delete( id );
    else next.add( id );

    return next;
  } );


  return (
    <div className= 'mx-auto my-12 max-w-7xl px-6 space-y-8'>
      <h1 className= 'text-2xl font-light tracking-wide'>
        Directories
      </h1>
    </div>
  );
}
