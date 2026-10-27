import logo from '@/src/client/assets/logo.svg';
import { useApi } from '@/src/client/context/ApiContext';
import { MenuIcon, UserIcon } from 'lucide-react';
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

        <div className= 'absolute top-1/2 right-4 transform -translate-y-1/2'>
          <div className= 'flex items-center gap-2'>
            <button
              className= 'inline-flex justify-center items-center gap-3 h-10 px-2.5'
            >
              <span className= 'text-sm'>
                Hi, <b>{ user?.username }</b>
              </span>
              <div className= 'inline-flex justify-center items-center w-8 h-8 bg-slate-50/70 rounded-full'>
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
