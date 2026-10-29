import { PlusIcon, XIcon } from 'lucide-react';
import { useId, useState, type KeyboardEvent } from 'react';


interface NameInputProps {
  label: string;
  names: string[];
  suggestions: string[];
  onChange: ( names: string[] ) => void;
}
