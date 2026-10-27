import logo from '@/src/client/assets/logo.svg';
import { useApi } from '@/src/client/context/ApiContext';
import {
  BookmarkIcon, FilterIcon, FolderIcon, GalleryVerticalEndIcon, HeartIcon, HomeIcon, ListVideoIcon,
  LogOutIcon, MenuIcon, PlayIcon, SearchIcon, SettingsIcon, TagIcon, UserIcon, XIcon
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';


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

const USER = [
  [ 'My Account', '/me', UserIcon ],
  [ 'History', '/history', GalleryVerticalEndIcon ],
  [ 'Settings', '/settings', SettingsIcon ]
] as const;


export function Header () {
  const { pathname } = useLocation();
  const { user, logout } = useApi();

  const [ menuOpen, setMenuOpen ] = useState( false );
  const [ userOpen, setUserOpen ] = useState( false );

  useEffect( () => { setMenuOpen( false ), setUserOpen( false ) }, [ pathname ] );
  useEffect( () => { if ( menuOpen ) setUserOpen( false ) }, [ menuOpen ] );
  useEffect( () => { if ( userOpen ) setMenuOpen( false ) }, [ userOpen ] );

  return (
    <>
      <header className= 'fixed top-0 inset-x-0 z-99 h-16 bg-slate-700 shadow'>
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
                  'w-[30vw] h-10 pl-3 pr-13 font-light tracking-wide bg-slate-800 border ' +
                  'border-transparent rounded outline-none transition focus:border-slate-500'
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
                'bg-slate-200 rounded transition hover:bg-white'
              }
            >
              <FilterIcon size= { 16 } />
              <span>Filter</span>
            </button>
          </div>
        </div>

        <div className= 'absolute top-1/2 right-4 transform -translate-y-1/2'>
          <div className= 'flex items-center gap-2'>
            <div className= 'relative'>
              <button
                onClick= { () => setUserOpen( ! userOpen ) }
                className= 'inline-flex justify-center items-center gap-3 h-10 px-2.5'
              >
                <span className= 'text-sm'>
                  Hi, <b>{ user?.username }</b>
                </span>
                <div className= 'inline-flex justify-center items-center w-8 h-8 bg-slate-200 rounded-full'>
                  <UserIcon size= { 20 } className= 'text-slate-900' />
                </div>
              </button>

              <div
                className= {
                  'absolute left-1/2 top-18 transform -translate-x-1/2 transition-all duration-100 delay-75 ease-out ' +
                  ( userOpen ? 'translate-y-0' : 'translate-y-5 opacity-0 pointer-events-none' )
                }
              >
                <div className= 'absolute -top-2 left-1/2 transform -translate-x-1/2 rotate-45 w-4 h-4 bg-slate-700' />

                <div className= 'relative z-1 w-48 py-4 bg-slate-700'>
                  { USER.map( ( [ label, url, Icon ] ) => (
                    <NavLink
                      to= { url }
                      className= { ( { isActive } ) =>
                        'flex items-center gap-3 w-full px-6 py-2 tracking-wider transition-colors delay-75 text-sm ' +
                        ( isActive ? 'bg-slate-50/20' : 'hover:bg-slate-50/10' )
                      }
                    >
                      <Icon size= { 16 } />
                      <span>{ label }</span>
                    </NavLink>
                  ) ) }

                  <button
                    onClick= { logout }
                    className= {
                      'flex items-center gap-3 mt-4 w-full px-6 py-2 tracking-wider transition-colors ' +
                      'delay-75 text-sm text-amber-300 hover:bg-slate-50/10'
                    }
                  >
                    <LogOutIcon size= { 16 } />
                    <span>Log Out</span>
                  </button>
                </div>
              </div>
            </div>

            <button
              onClick= { () => setMenuOpen( ! menuOpen ) }
              className= 'inline-flex justify-center items-center w-10 h-10'
            >
              { menuOpen ? <XIcon size= { 22 } /> : <MenuIcon size= { 22 } /> }
            </button>
          </div>
        </div>
      </header>

      <div
        onClick= { () => { setMenuOpen( false ), setUserOpen( false ) } }
        className= {
          'fixed inset-0 z-98 bg-slate-900 transition-opacity ' +
          ( menuOpen || userOpen ? 'opacity-50' : 'opacity-0 pointer-events-none' )
        }
      />

      <div
        className= {
          'fixed top-16 right-0 bottom-0 z-99 bg-slate-700 py-12 transition-all duration-150 ' + 
          'ease-out delay-75 transform overflow-hidden ' + ( menuOpen ? 'w-80' : 'w-0' )
        }
      >
        <nav>
          { NAV.map( ( [ label, url, Icon ] ) => label ? (
            <NavLink
              to= { url }
              className= { ( { isActive } ) =>
                'flex items-center gap-4 w-full px-6 py-2.5 tracking-wider transition-colors delay-75 ' +
                ( isActive ? 'bg-slate-50/20' : 'hover:bg-slate-50/10' )
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
    </>
  );
}
