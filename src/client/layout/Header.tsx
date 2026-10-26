import logo from '@/src/client/assets/logo.svg';
import { useApi } from '@/src/client/context/ApiContext';
import { FilterIcon, FolderIcon, LogOutIcon, SearchIcon } from 'lucide-react';
import { Link } from 'react-router';


export function Header () {
  const { user, logout } = useApi();

  return (
    <header className= 'fixed inset-x-0 top-0 z-99 h-18 bg-slate-800 shadow'>
      { /** Menu */ }
      <div className= 'absolute top-1/2 left-4 transform -translate-y-1/2'>
        <Link to= '/'>
          <img
            src= { logo }
            className= 'w-11 h-11'
            alt= 'Frame'
          />
        </Link>
      </div>

      { /** Search + Filter */ }
      <div className= 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'>
        <form className= 'flex items-center gap-2'>
          <div className= 'flex mr-6 h-10 bg-slate-900 rounded-full overflow-hidden'>
            <input
              type= 'text'
              className= 'w-[30vw] pl-6 outline-none'
              placeholder= 'Search Frame …'
            />

            <button
              type= 'submit'
              className= 'w-12 h-10 pl-2'
            >
              <SearchIcon size= { 22 } />
            </button>
          </div>

          <button
            className= {
              'flex items-center gap-2 h-8.5 px-3 text-sm font-medium text-slate-900 ' +
              'bg-slate-200 rounded transition hover:bg-white'
            }
          >
            <FilterIcon size= { 16 } />
            <span>Filter</span>
          </button>

          <button
            className= {
              'flex items-center gap-2 h-8.5 px-2.5 text-sm font-medium text-slate-900 ' +
              'bg-slate-200 rounded transition hover:bg-white'
            }
          >
            <FolderIcon size= { 16 } />
          </button>
        </form>
      </div>

      { /** User */ }
      <div className= 'absolute top-1/2 right-4 transform -translate-y-1/2'>
        <div className= 'flex items-center gap-6'>
          <span className= 'text-sm'>
            Hi, <b>{ user?.username }</b>
          </span>

          <button
            onClick= { () => logout().catch( () => {} ) }
            className= {
              'flex items-center gap-2 h-8.5 px-3 text-sm font-medium text-slate-900 ' +
              'bg-slate-200 rounded transition hover:bg-white'
            }
          >
            <LogOutIcon size= { 16 } />
            <span>Sign out</span>
          </button>
        </div>
      </div>
    </header>
  );
}
