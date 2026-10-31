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

  const close = () => { if ( saving ) return; setOpen( false ), setError( null ), setValue( name ) };
  const edit = () => { setValue( name ), setError( null ), setOpen( true ) };

  const save = async ( e: SubmitEvent ) => {
    e.preventDefault();

    const next = value.trim();
    if ( ! next || next === name || saving ) return;

    setSaving( true ), setError( null );

    try { await onRename( next ), setOpen( false ) }
    catch ( err ) { setError( err instanceof Error ? err.message : 'Could not rename entry.' ) }
    finally { setSaving( false ) }
  };

  const remove = async () => {
    if ( saving || ! window.confirm( `Delete ${ kind } "${ name }"?` ) ) return;

    setSaving( true ), setError( null );

    try { await onDelete() }
    catch ( err ) {
      setError( err instanceof Error ? err.message : 'Could not delete entry.' );
      setOpen( true );
    }
    finally { setSaving( false ) }
  };

  const swap = async () => {
    if ( saving ) return;

    const target = kind === 'category' ? 'tag' : 'category';
    if ( ! window.confirm( `Convert "${ name }" into a ${ target }?` ) ) return;

    setSaving( true ), setError( null );

    try { await onSwap() }
    catch ( err ) {
      setError( err instanceof Error ? err.message : 'Could not convert entry.' );
      setOpen( true );
    }
    finally { setSaving( false ) }
  };


  return (
    <></>
  );
}
