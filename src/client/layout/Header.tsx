import logo from '@/src/client/assets/logo.svg';
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
      <div className= 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2'></div>

      { /** User */ }
      <div className= 'absolute top-1/2 right-4 transform -translate-y-1/2'></div>
    </header>
  );
}
