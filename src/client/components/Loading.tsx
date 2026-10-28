import { Loader2Icon } from 'lucide-react';


interface LoadingProps {
  size?: number;
  className?: string;
}


export function Loading ( { size = 60, className = '' }: LoadingProps ) {
  return (
    <div className= { `flex justify-center items-center ${ className }` }>
      <Loader2Icon size= { size } strokeWidth= { 0.8 } className= 'animate-spin' />
    </div>
  );
}
