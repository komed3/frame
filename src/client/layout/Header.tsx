import logo from '@/src/client/assets/logo.svg';
import { useApi } from '@/src/client/context/ApiContext';
import {
  BookmarkIcon, FilterIcon, FolderIcon, HeartIcon, HomeIcon, ListVideoIcon, MenuIcon,
  PlayIcon, SearchIcon, SettingsIcon, TagIcon, UserIcon, XIcon
} from 'lucide-react';
import { useState } from 'react';
import { Link, NavLink } from 'react-router';


const NAV = [
  [ 'Home', '/', HomeIcon ],
  [ 'All Media', '/all', PlayIcon ],
  [ 'Categories', '/categories', FolderIcon ],
  [ 'Tags', '/tags', TagIcon ],
  [],
  [ 'Playlists', '/playlists', ListVideoIcon ],
  [ 'Favorites', '/favorites', HeartIcon ],
  [ 'Markers', '/markers', BookmarkIcon ],
  [],
  [ 'Admin', '/server', SettingsIcon ]
] as const;


export function Header () {
  const { user } = useApi();
  const [ menuOpen, setMenuOpen ] = useState( false );

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
              onClick= { () => setMenuOpen( ! menuOpen ) }
              className= 'inline-flex justify-center items-center w-10 h-10'
            >
              { menuOpen ? <XIcon size= { 22 } /> : <MenuIcon size= { 22 } /> }
            </button>
          </div>
        </div>
      </header>

      <div className= { 'fixed top-16 inset-x-0 z-99 bottom-0 flex ' + ( ! menuOpen && 'pointer-events-none' ) }>
        <div
          className= { 'flex-1 bg-slate-900/70 transition-opacity ' + ( ! menuOpen && 'opacity-0' ) }
          onClick= { () => setMenuOpen( false ) }
        />

        <div
          className= {
            'shrink-0 w-80 bg-slate-50/10 py-12 transition-transform duration-150 ease-out transform ' +
            ( menuOpen ? 'translate-x-0' : 'translate-x-full' )
          }
        >
          <nav>
            { NAV.map( ( [ label, url, Icon ] ) => label ? (
              <NavLink
                to= { url }
                className= { ( { isActive } ) =>
                  'flex items-center gap-4 w-full px-6 py-2.5 tracking-wider transition-colors ' +
                  ( isActive ? 'bg-slate-50/20' : 'hover:bg-slate-50/5' )
                }
              >
                <Icon size= { 20 } />
                <span>{ label }</span>
              </NavLink>
            ) : (
              <hr className= 'mx-6 my-5 border-dashed border-slate-50/20' />
            ) ) }
          </nav>
        </div>
      </div>
    </>
  );
}
