import { NameInput } from '@/src/client/components/NameInput';
import { useApi } from '@/src/client/context/ApiContext';
import { useBodyScrollLock } from '@/src/client/hooks/useBodyScrollLock';
import type { CategoryRecord } from '@/src/shared/types/taxonomy';
import { ArrowRightLeftIcon, CheckIcon, SettingsIcon, TrashIcon, XIcon } from 'lucide-react';
import { type SubmitEvent, useState } from 'react';


interface TaxonomyActionsProps {
  kind: 'category' | 'tag';
  id: string;
  parentId?: string | null;
  name: string;
  onRename: ( name: string ) => Promise< void >;
  onDelete: () => Promise< void >;
  onSwap: () => Promise< void >;
}


const BUTTON =
  'flex items-center gap-2.5 h-10 px-5 text-[15px] font-medium bg-slate-50/10 ' +
  'transition-colors hover:bg-slate-50/20';

const ACTION_BUTTON =
  'inline-flex items-center gap-3 px-4 py-2.5 text-sm bg-slate-50/10 rounded transition-colors ' +
  'hover:bg-slate-50/20 disabled:opacity-50 disabled:pointer-events-none';


function getDescendants ( categories: CategoryRecord[], id: string ): string[] {
  const descendants: string[] = [], parents = [ id ];

  while ( parents.length ) {
    const parentId = parents.pop()!;

    categories.forEach( category => {
      if ( category.parentId !== parentId ) return;
      descendants.push( category.id ), parents.push( category.id );
    } );
  }

  return descendants;
}


export function TaxonomyActions ( { kind, id, parentId = null, name, onRename, onDelete, onSwap }: TaxonomyActionsProps ) {
  const { canEdit, categories } = useApi();

  const [ open, setOpen ] = useState( false );
  const [ value, setValue ] = useState( name );
  const [ parent, setParent ] = useState< string[] >( [] );
  const [ categoryItems, setCategoryItems ] = useState< CategoryRecord[] >( [] );
  const [ error, setError ] = useState< string | null >( null );
  const [ saving, setSaving ] = useState( false );


  useBodyScrollLock( open );

  const close = () => {
    if ( saving ) return;

    setOpen( false ), setError( null ), setValue( name );
    setParent( [] );
  };

  const edit = async () => {
    setValue( name ), setError( null );

    if ( kind === 'category' ) {
      try {
        const items = await categories.list(), descendants = getDescendants( items, id );
        setCategoryItems( items.filter( item => item.id !== id && ! descendants.includes( item.id ) ) );

        const currentParent = items.find( item => item.id === parentId );
        setParent( currentParent ? [ currentParent.name ] : [] );
      } catch ( err ) {
        setError( err instanceof Error ? err.message : 'Could not load categories.' );
      }
    }

    setOpen( true );
  };

  const save = async ( e: SubmitEvent ) => {
    e.preventDefault();

    const next = value.trim();
    const selectedParent = categoryItems.find( item => item.name === parent[ 0 ] )?.id ?? null;

    if ( ! next || saving ) return;
    if ( next === name && ( kind !== 'category' || selectedParent === parentId ) ) return;

    setSaving( true ), setError( null );

    try {
      if ( next !== name ) await onRename( next );
      if ( kind === 'category' && selectedParent !== parentId ) await categories.setParent( id, selectedParent );
      setOpen( false );
    }

    catch ( err ) { setError( err instanceof Error ? err.message : 'Could not update entry.' ) }
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


  return canEdit && (
    <>
      <div className= 'flex items-center gap-1'>
        <button
          onClick= { edit }
          className= { BUTTON + ' rounded-l-full' }
        >
          <SettingsIcon size= { 16 } />
          <span>Edit</span>
        </button>

        <button
          onClick= { swap }
          disabled= { saving }
          className= { BUTTON }
        >
          <ArrowRightLeftIcon size= { 16 } />
          <span>Change to { kind === 'category' ? 'Tag' : 'Category' }</span>
        </button>

        <button
          onClick= { remove }
          disabled= { saving }
          className= { BUTTON + ' rounded-r-full' }
        >
          <TrashIcon size= { 16 } />
          <span>Delete</span>
        </button>
      </div>

      { open && (
        <>
          <div
            className= 'fixed inset-0 z-40 bg-slate-900 opacity-50'
            onClick= { close }
          />

          <div
            className= {
              'fixed top-1/2 left-1/2 -translate-1/2 z-50 flex flex-col gap-5 ' +
              'w-[90%] max-w-lg p-5 bg-slate-700 rounded shadow-lg'
            }
          >
            <div className= 'flex justify-between items-center'>
              <h2 className= 'font-medium'>
                Edit { kind }
              </h2>

              <button
                aria-label= 'Close'
                onClick= { close }
                disabled= { saving }
              >
                <XIcon size= { 20 } />
              </button>
            </div>

            <form onSubmit= { save } className= 'flex flex-col gap-4'>
              <input
                autoFocus
                value= { value }
                onChange= { e => setValue( e.target.value ) }
                placeholder= { kind === 'category' ? 'Category name' : 'Tag name' }
                maxLength= { 200 }
                className= {
                  'w-full px-3 py-2 text-sm bg-slate-900 border border-slate-600 rounded ' +
                  'focus:outline-none focus:border-slate-500'
                }
              />

              { kind === 'category' && (
                <NameInput
                  label= 'Parent category'
                  names= { parent }
                  suggestions= { categoryItems.map( item => item.name ) }
                  onChange= { names => setParent( names.slice( -1 ) ) }
                />
              ) }

              { error && (
                <p role= 'alert' className= 'text-sm text-red-400'>
                  { error }
                </p>
              ) }

              <div className= 'flex justify-end gap-2'>
                <button
                  onClick= { close }
                  disabled= { saving }
                  className= { ACTION_BUTTON }
                >
                  Cancel
                </button>

                <button
                  type= 'submit'
                  disabled= { ! value.trim() || ( value.trim() === name && ( kind !== 'category' || (
                    categoryItems.find( item => item.name === parent[ 0 ] )?.id ?? null
                  ) === parentId ) ) || saving }
                  className= { ACTION_BUTTON + ' bg-slate-50/20 hover:bg-slate-50/30' }
                >
                  <CheckIcon size= { 16 } />
                  <span>{ saving ? 'Saving …' : 'Save' }</span>
                </button>
              </div>
            </form>
          </div>
        </>
      ) }
    </>
  );
}
