import { MenuIcon } from 'lucide-react';


export function Header () {
  return (
    <header className= 'fixed top-0 inset-x-0 z-99 h-16 bg-slate-50/10 shadow'>
      <div className= 'absolute top-1/2 right-4 transform -translate-y-1/2'>
        <div className= 'flex items-center gap-4'>
          <button
            className= 'inline-flex justify-center items-center w-10 h-10'
          >
            <MenuIcon size= { 22 } />
          </button>
        </div>
      </div>
    </header>
  );
}
