import logo from '@/src/client/assets/logo.svg';
import { SearchIcon } from 'lucide-react';
import { Link } from 'react-router';


export function Header () {
  return (
    <header className= 'fixed inset-x-0 top-0 z-99 h-18 bg-slate-800 shadow'>
      { /** Logo */ }
      <div className= 'absolute top-1/2 left-4 transform -translate-y-1/2'>
        <Link to= '/'>
          <img
            src= { logo }
            className= 'w-10 h-10'
            alt= 'Frame'
          />
        </Link>
      </div>

      { /** Search */ }
      <div className= 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'>
        <form>
          <div className= 'flex h-10 bg-slate-900 rounded-full overflow-hidden'>
            <input
              type= 'text'
              className= 'w-[30vw] pl-6 outline-none'
              placeholder= 'Search Frame …'
            />

            <button
              type= 'submit'
              className= 'w-12 h-10 pl-3'
            >
              <SearchIcon size= { 20 } />
            </button>
          </div>
        </form>
      </div>

      { /** User */ }
      <div className= 'absolute top-1/2 right-4 transform -translate-y-1/2'></div>
    </header>
  );
}
