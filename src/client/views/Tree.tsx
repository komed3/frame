import { Loading } from '@/src/client/components/Loading';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import type { ApiDirectoryTreeResult } from '@/src/shared/types/api';
import type { MediaDirectoryTree } from '@/src/shared/types/directories';
import type { MediaRoot } from '@/src/shared/types/roots';
import { ChevronDownIcon, ChevronRightIcon, FolderIcon } from 'lucide-react';
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


export function Tree () {
  return (
    <></>
  );
}
