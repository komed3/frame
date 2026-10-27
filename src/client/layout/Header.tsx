import logo from '@/src/client/assets/logo.svg';
import { Select, type SelectOption } from '@/src/client/components/Select';
import { useApi } from '@/src/client/context/ApiContext';
import type { MediaType } from '@/src/shared/types/media';
import type { MediaSearchProgress, MediaSearchQueryMode, MediaSearchSort } from '@/src/shared/types/search';
import {
  BookmarkIcon, FilterIcon, FolderIcon, GalleryVerticalEndIcon, HeartIcon, HomeIcon, ListVideoIcon,
  LogOutIcon, MenuIcon, PlayIcon, SearchIcon, SettingsIcon, TagIcon, UserIcon, XIcon
} from 'lucide-react';
import { type SubmitEvent, useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router';


interface SearchFilters {
  type: string;
  categoryId: string;
  tagId: string;
  availability: string;
  favorite: string;
  played: string;
  progress: string;
  queryMode: MediaSearchQueryMode;
  sortBy: MediaSearchSort;
  sortDirection: 'asc' | 'desc';
}


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

const DEFAULT_FILTERS: SearchFilters = {
  type: '', categoryId: '', tagId: '', availability: '', favorite: '', played: '',
  progress: '', queryMode: 'all', sortBy: 'title', sortDirection: 'asc'
};

const TYPE_OPTIONS: SelectOption[] = [
  { value: '', label: 'All media types' },
  { value: 'video', label: 'Video' },
  { value: 'audio', label: 'Audio' },
  { value: 'image', label: 'Image' },
  { value: 'text', label: 'Text' },
  { value: 'other', label: 'Other' }
];

const AVAILABILITY_OPTIONS: SelectOption[] = [
  { value: '', label: 'All media' },
  { value: 'true', label: 'Available' },
  { value: 'false', label: 'Missing files' }
];

const FAVORITE_OPTIONS: SelectOption[] = [
  { value: '', label: 'All media' },
  { value: 'true', label: 'Favorites only' },
  { value: 'false', label: 'Exclude favorites' }
];

const PLAYED_OPTIONS: SelectOption[] = [
  { value: '', label: 'Any playback status' },
  { value: 'true', label: 'Played' },
  { value: 'false', label: 'Not played' }
];

const PROGRESS_OPTIONS: SelectOption[] = [
  { value: '', label: 'Any progress' },
  { value: 'not-started', label: 'Not started' },
  { value: 'started', label: 'Started' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'completed', label: 'Completed' }
];

const QUERY_MODE_OPTIONS: SelectOption[] = [
  { value: 'all', label: 'All terms' },
  { value: 'any', label: 'Any term' },
  { value: 'phrase', label: 'Exact phrase' }
];

const SORT_OPTIONS: SelectOption[] = [
  { value: 'title', label: 'Title' },
  { value: 'createdAt', label: 'Date added' },
  { value: 'modifiedAt', label: 'Last modified' },
  { value: 'sizeBytes', label: 'File size' },
  { value: 'durationMs', label: 'Duration' },
  { value: 'rating', label: 'Rating' },
  { value: 'releasedAt', label: 'Release date' },
  { value: 'relevance', label: 'Relevance' }
];

const DIRECTION_OPTIONS: SelectOption[] = [
  { value: 'asc', label: 'Ascending' },
  { value: 'desc', label: 'Descending' }
];


export function Header () {
  const { user, logout, tags, categories } = useApi();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [ menuOpen, setMenuOpen ] = useState( false );
  const [ userOpen, setUserOpen ] = useState( false );
  const [ filterOpen, setFilterOpen ] = useState( false );

  const [ query, setQuery ] = useState( '' );
  const [ filters, setFilters ] = useState< SearchFilters >( { ...DEFAULT_FILTERS } );
  const [ tagRecords, setTagRecords ] = useState< { id: string; name: string }[] >( [] );
  const [ categoryRecords, setCategoryRecords ] = useState< { id: string; name: string }[] >( [] );


  const close = ( { menu = true, user = true, filter = true } = {} ) => {
    menu && setMenuOpen( false ); user && setUserOpen( false ); filter && setFilterOpen( false );
  };

  useEffect( () => { if ( menuOpen ) close( { menu: false } ) }, [ menuOpen ] );
  useEffect( () => { if ( userOpen ) close( { user: false } ) }, [ userOpen ] );
  useEffect( () => { if ( filterOpen ) close( { filter: false } ) }, [ filterOpen ] );
  useEffect( close, [ pathname ] );

  useEffect( () => {
    let active = true;

    Promise.all( [ tags.list(), categories.list() ] ).then( ( [ tagRecords, categoryRecords ] ) => {
      if ( ! active ) return;

      setTagRecords( tagRecords );
      setCategoryRecords( categoryRecords );
    } ).catch( () => {} );

    return () => { active = false };
  }, [ tags, categories ] );


  const setFilter = ( key: keyof SearchFilters, value: string ) => {
    setFilters( current => ( { ...current, [ key ]: value } ) );
  };

  const applyFilters = () => {
    const params = new URLSearchParams();

    if ( query.trim() ) params.set( 'query', query.trim() );
    if ( filters.queryMode !== 'all' ) params.set( 'queryMode', filters.queryMode );
    if ( filters.type ) params.append( 'types', filters.type as MediaType );
    if ( filters.categoryId ) params.append( 'categoryIds', filters.categoryId );
    if ( filters.tagId ) params.append( 'tagIds', filters.tagId );
    if ( filters.availability ) params.set( 'available', filters.availability );
    if ( filters.favorite ) params.set( 'favorite', filters.favorite );
    if ( filters.played ) params.set( 'played', filters.played );
    if ( filters.progress ) params.set( 'progress', filters.progress as MediaSearchProgress );
    if ( filters.sortBy !== 'title' ) params.set( 'sortBy', filters.sortBy );
    if ( filters.sortDirection !== 'asc' ) params.set( 'sortDirection', filters.sortDirection );

    const search = params.toString();
    navigate( `/search${ search ? `?${ search }` : '' }` );
    setFilterOpen( false );
  };

  const handleSearch = ( e: SubmitEvent< HTMLFormElement > ) => { e.preventDefault(), applyFilters() };


  return (
    <>
      <header className= 'fixed top-0 inset-x-0 z-99 h-16 bg-slate-700 shadow-lg'>
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
          <form onSubmit= { handleSearch } className= 'flex items-center gap-6'>
            <div className= 'relative'>
              <input
                type= 'text'
                value= { query }
                onChange= { e => setQuery( e.target.value ) }
                placeholder= 'Search Frame …'
                className= {
                  'w-[30vw] h-10 pl-3 pr-13 font-light tracking-wide bg-slate-800 border ' +
                  'border-transparent rounded outline-none transition focus:border-slate-500'
                }
              />

              <button
                type= 'submit'
                aria-label= 'Search'
                className= 'absolute top-0 right-0 inline-flex justify-center items-center w-10 h-10'
              >
                <SearchIcon size= { 20 } />
              </button>
            </div>

            <button
              type= 'button'
              aria-expanded= { filterOpen }
              onClick= { () => setFilterOpen( ! filterOpen ) }
              className= {
                'flex items-center gap-2 h-8 px-3 text-sm font-medium text-slate-900 ' +
                'bg-slate-200 rounded transition hover:bg-white'
              }
            >
              <FilterIcon size= { 16 } />
              <span>Filter</span>
            </button>
          </form>
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
                  'absolute left-1/2 top-17 transform -translate-x-1/2 shadow-lg transition-all duration-100 delay-75 ease-out ' +
                  ( userOpen ? 'translate-y-0' : 'translate-y-5 opacity-0 pointer-events-none' )
                }
              >
                <div className= 'absolute -top-1.5 left-1/2 transform -translate-x-1/2 rotate-45 w-3 h-3 bg-slate-700' />

                <div className= 'relative z-1 w-48 py-4 bg-slate-700 rounded'>
                  { USER.map( ( [ label, url, Icon ] ) => (
                    <NavLink
                      key= { url }
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
        onClick= { () => close() }
        className= {
          'fixed inset-0 z-97 bg-slate-900 transition-opacity ' +
          ( menuOpen || userOpen || filterOpen ? 'opacity-50' : 'opacity-0 pointer-events-none' )
        }
      />

      <div
        className= {
          'fixed top-16 right-0 bottom-0 z-98 bg-slate-700 py-12 shadow-lg transition-all duration-150 ' +
          'ease-out delay-75 transform overflow-hidden ' + ( menuOpen ? 'w-80' : 'w-0' )
        }
      >
        <nav>
          { NAV.map( ( [ label, url, Icon ], i ) => label ? (
            <NavLink
              key= { url }
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
            <hr key= { `separator-${ i }` } className= 'mx-6 my-5 border-dashed border-slate-50/20' />
          ) ) }
        </nav>
      </div>

      <div
        className= {
          'fixed left-1/2 top-20 z-99 transform -translate-x-1/2 shadow-lg transition-all duration-100 delay-75 ' +
          'ease-out ' + ( filterOpen ? 'translate-y-0' : 'translate-y-5 opacity-0 pointer-events-none' )
        }
      >
        <div className= 'absolute -top-1.5 left-1/2 transform -translate-x-1/2 rotate-45 w-3 h-3 bg-slate-700' />

        <div className= 'relative z-1 p-6 space-y-6 bg-slate-700 rounded'>
          <div className= 'flex justify-between items-center gap-4'>
            <h2 className= 'font-medium'>Media Filter</h2>

            <button
              aria-label= 'Close filters'
              onClick= { () => setFilterOpen( false ) }
              className= 'inline-flex justify-center items-center w-6 h-6'
            >
              <XIcon size= { 20 } />
            </button>
          </div>

          <div className= 'grid grid-cols-3 gap-x-6 gap-y-4 w-240'>
            <Select
              label= 'Media Type'
              value= { filters.type }
              options= { TYPE_OPTIONS }
              onChange= { v => setFilter( 'type', v ) }
            />

            <Select
              label= 'Availability'
              value= { filters.availability }
              options= { AVAILABILITY_OPTIONS }
              onChange= { v => setFilter( 'availability', v ) }
            />

            <Select
              label= 'Category'
              value= { filters.categoryId }
              options= { [
                { value: '', label: 'All categories' },
                ...categoryRecords.map( ( { id, name } ) => ( { value: id, label: name } ) )
              ] }
              onChange= { v => setFilter( 'categoryId', v ) }
            />

            <Select
              label= 'Tag'
              value= { filters.tagId }
              options= { [
                { value: '', label: 'All tags' },
                ...tagRecords.map( ( { id, name } ) => ( { value: id, label: name } ) )
              ] }
              onChange= { v => setFilter( 'tagId', v ) }
            />

            <Select
              label= 'Favorites'
              value= { filters.favorite }
              options= { FAVORITE_OPTIONS }
              onChange= { v => setFilter( 'favorite', v ) }
            />

            <Select
              label= 'Playback'
              value= { filters.played }
              options= { PLAYED_OPTIONS }
              onChange= { v => setFilter( 'played', v ) }
            />

            <Select
              label= 'Progress'
              value= { filters.progress }
              options= { PROGRESS_OPTIONS }
              onChange= { v => setFilter( 'progress', v ) }
            />

            <Select
              label= 'Search Mode'
              value= { filters.queryMode }
              options= { QUERY_MODE_OPTIONS }
              onChange= { v => setFilter( 'queryMode', v ) }
            />

            <Select
              label= 'Sort By'
              value= { filters.sortBy }
              options= { SORT_OPTIONS }
              onChange= { v => setFilter( 'sortBy', v ) }
            />

            <Select
              label= 'Direction'
              value= { filters.sortDirection }
              options= { DIRECTION_OPTIONS }
              onChange= { v => setFilter( 'sortDirection', v ) }
            />
          </div>

          <div className= 'flex justify-end items-center gap-4'>
            <button
              onClick= { () => setFilters( { ...DEFAULT_FILTERS } ) }
              className= {
                'px-3.5 py-2 text-sm font-medium text-slate-300 bg-slate-50/10 rounded ' +
                'transition-colors hover:bg-slate-50/20'
              }
            >
              Reset
            </button>

            <button
              onClick= { applyFilters }
              className= {
                'px-3.5 py-2 text-sm font-medium text-slate-900 bg-slate-200 rounded ' +
                'transition-colors hover:bg-white'
              }
            >
              Apply filters
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
