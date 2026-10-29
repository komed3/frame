import { PlusIcon, XIcon } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';


interface NameInputProps {
  label: string;
  names: string[];
  suggestions: string[];
  onChange: ( names: string[] ) => void;
}


function uniqueNames ( names: string[] ) : string[] {
  return names.reduce< string[] >( ( res, name ) => {
    const clean = name.trim();
    if ( clean && ! res.some( i => i.toLowerCase() === clean.toLowerCase() ) ) res.push( clean );
    return res;
  }, [] );
}


export function NameInput ( { label, names, suggestions, onChange }: NameInputProps ) {
  const [ input, setInput ] = useState( '' );
  const listId = useId();


  const add = ( value = input ) => { onChange( uniqueNames( [ ...names, value ] ) ), setInput( '' ) };

  const onKeyDown = ( e: KeyboardEvent< HTMLInputElement > ) => {
    if ( e.key === 'Enter' || e.key === ',' ) e.preventDefault(), add();
    else if ( e.key === 'Backspace' && ! input && names.length ) onChange( names.slice( 0, -1 ) );
  };


  return (
    <div className= 'space-y-1'>
      <label className= 'block text-sm text-slate-400'>
        { label }
      </label>

      <div className= 'flex gap-2 h-9.5'>
        <input
          value= { input }
          onChange= { e => setInput( e.target.value ) }
          onKeyDown= { onKeyDown }
          onBlur= { () => input.trim() && add() }
          list= { listId }
          placeholder= 'Add or select …'
          className= {
            'w-full h-full px-3 text-sm bg-slate-900 border border-slate-700 rounded ' +
            'focus:outline-none focus:border-slate-500'
          }
        />

        <datalist id= { listId }>
          { suggestions.map( n => <option key= { n } value= { n } /> ) }
        </datalist>

        <button
          onClick= { () => add() }
          className= {
            'shrink-0 flex justify-center items-center gap-2 h-full aspect-square text-sm ' +
            'bg-slate-50/10 rounded transition-colors duration-100 hover:bg-slate-50/20'
          }
        >
          <PlusIcon size= { 16 } />
        </button>
      </div>

      <div className= 'flex flex-wrap gap-2 mt-3'>
        { names.map( name => (
          <span
            key= { name }
            className= 'flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-50/10 rounded-full'
          >
            { name }

            <button
              aria-label= { `Remove ${ name }` }
              onClick= { () => onChange( names.filter( n => n !== name ) ) }
              className= 'text-slate-400 hover:text-white'
            >
              <XIcon size= { 14 } />
            </button>
          </span>
        ) ) }
      </div>
    </div>
  );
}
