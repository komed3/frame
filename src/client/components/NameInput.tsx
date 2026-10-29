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
