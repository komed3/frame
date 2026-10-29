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
    if ( clean && ! res.some( item => item.toLowerCase() === clean.toLowerCase() ) ) res.push( clean );
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
}
