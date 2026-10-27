import { ChevronDownIcon } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';


export interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: ( value: string ) => void;
  placeholder?: string;
}
