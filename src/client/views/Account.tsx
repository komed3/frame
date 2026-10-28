import { useApi } from '@/src/client/context/ApiContext';
import { usePageTitle } from '@/src/client/hooks/usePageTitle';
import { formatDate } from '@/src/client/utils/format';
import { GalleryVerticalEndIcon, HeartIcon, ListVideoIcon, LogOutIcon, SettingsIcon } from 'lucide-react';
import { Link } from 'react-router';


const NAV = [
  [ 'Settings', '/settings', SettingsIcon ],
  [ 'History', '/history', GalleryVerticalEndIcon ],
  [ 'Playlists', '/playlists', ListVideoIcon ],
  [ 'Favorites', '/favorites', HeartIcon ]
] as const;


export function Account () {
  const { user, logout } = useApi();

  usePageTitle( 'My Account' );


  return user && (
    <div className= 'mx-auto my-12 max-w-5xl px-6 space-y-8'>
      <h1 className= 'text-2xl font-light tracking-wide'>
        My Account
      </h1>

      <div className= 'p-6 space-y-5 bg-slate-800 rounded shadow-lg'>
        <h2 className= 'text-lg font-medium'>
          Account Information
        </h2>

        <div className= 'divide-y divide-dashed divide-slate-700/70'>
          { [
            [ 'Username', user.username ],
            [ 'User ID', user.id ],
            [ 'Role', user.isAdmin ? 'Administrator' : 'User' ],
            [ 'Created', formatDate( user.createdAt ) ],
            [ 'Account Status', user.disabledAt ? 'Disabled' : 'Active' ]
          ].map( ( [ label, value ] ) => (
            <div key= { label } className= 'flex justify-between items-center gap-6 py-4'>
              <span className= 'font-extralight'>
                { label }
              </span>

              <b className= 'text-right font-medium break-all'>
                { value }
              </b>
            </div>
          ) ) }
        </div>
      </div>

      <div className= 'grid grid-cols-5 gap-4'>
        { NAV.map( ( [ label, url, Icon ] ) => (
          <Link
            key= { url }
            to= { url }
            className= {
              'flex flex-col justify-center items-center gap-1 pt-4 pb-3 text-center bg-slate-50/10 ' +
              'rounded shadow-lg transition-colors duration-100 hover:bg-slate-50/20'
            }
          >
            <Icon size= { 24 } strokeWidth= { 1.6 } />
            <span>{ label }</span>
          </Link>
        ) ) }

        <button
          onClick= { logout }
          className= {
              'flex flex-col justify-center items-center gap-1 pt-4 pb-3 text-center bg-slate-50/10 ' +
              'rounded shadow-lg transition-colors duration-100 hover:bg-slate-50/20'
            }
          >
            <LogOutIcon size= { 16 } />
            <span>Log Out</span>
          </button>
      </div>
    </div>
  );
}
