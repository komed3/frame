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
  const { canEdit } = useApi();

  const [ open, setOpen ] = useState( false );
  const [ value, setValue ] = useState( name );
  const [ error, setError ] = useState< string | null >( null );
  const [ saving, setSaving ] = useState( false );


  useBodyScrollLock( open );


  return (
    <></>
  );
}
