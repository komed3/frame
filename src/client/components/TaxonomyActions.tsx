import { useApi } from '@/src/client/context/ApiContext';
import { useBodyScrollLock } from '@/src/client/hooks/useBodyScrollLock';
import { ArrowRightLeftIcon, CheckIcon, SettingsIcon, TrashIcon, XIcon } from 'lucide-react';
import { type SubmitEvent, useState } from 'react';


interface TaxonomyActionsProps {
  kind: 'category' | 'tag';
  name: string;
  onRename: ( name: string ) => Promise< void >;
  onDelete: () => Promise< void >;
  onSwap: () => Promise< void >;
}


export function TaxonomyActions ( { kind, name, onRename, onDelete, onSwap }: TaxonomyActionsProps ) {
  return (
    <></>
  );
}
