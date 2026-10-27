import logo from '@/src/client/assets/logo.svg';
import { useApi } from '@/src/client/context/ApiContext';
import { FilterIcon, MenuIcon, SearchIcon, UserIcon } from 'lucide-react';
import { Link } from 'react-router';


export function Header () {
  const { user } = useApi();

  return (
    <>
      <header className= 'fixed top-0 inset-x-0 z-99 h-16 bg-slate-50/10 shadow'>
        <div className= 'absolute top-1/2 left-4 transform -translate-y-1/2'>
          <Link to= '/'>
            <img
              src= { logo }
              className= 'w-10 h-10'
              alt= 'Frame'
            />
          </Link>
        </div>

        <div className= 'absolute top-1/2 left-1/2 transform -translate-1/2'>
          <div className= 'flex items-center gap-6'>
            <div className= 'relative'>
              <input
                type= 'text'
                placeholder= 'Search Frame …'
                className= {
                  'w-[30vw] h-10 pl-3 pr-13 font-light tracking-wide bg-slate-900/60 border ' +
                  'border-transparent rounded outline-none transition focus:border-slate-400'
                }
              />

              <button
                type= 'submit'
                className= 'absolute top-0 right-0 inline-flex justify-center items-center w-10 h-10'
              >
                <SearchIcon size= { 20 } />
              </button>
            </div>

            <button
              className= {
                'flex items-center gap-2 h-8 px-3 text-sm font-medium text-slate-900 ' +
                'bg-slate-50/80 rounded transition hover:bg-white'
              }
            >
              <FilterIcon size= { 16 } />
              <span>Filter</span>
            </button>
          </div>
        </div>

        <div className= 'absolute top-1/2 right-4 transform -translate-y-1/2'>
          <div className= 'flex items-center gap-2'>
            <button
              className= 'inline-flex justify-center items-center gap-3 h-10 px-2.5'
            >
              <span className= 'text-sm'>
                Hi, <b>{ user?.username }</b>
              </span>
              <div className= 'inline-flex justify-center items-center w-8 h-8 bg-slate-50/80 rounded-full'>
                <UserIcon size= { 20 } className= 'text-slate-900' />
              </div>
            </button>

            <button
              className= 'inline-flex justify-center items-center w-10 h-10'
            >
              <MenuIcon size= { 22 } />
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
