import { Loading } from '@/src/client/components/Loading';
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';


const modules = import.meta.glob< Record< string, React.ComponentType > >( './views/*.tsx' );

const view = ( name: string ) => lazy( () =>
  modules[ `./views/${ name }.tsx` ]().then( m => ( { default: m[ name ] } ) )
);


const Account = view( 'Account' );
const Admin = view( 'Admin' );
const Categories = view( 'Categories' );
const Category = view( 'Category' );
const Editor = view( 'Editor' );
const Favorites = view( 'Favorites' );
const Help = view( 'Help' );
const History = view( 'History' );
const Home = view( 'Home' );
const Markers = view( 'Markers' );
const Media = view( 'Media' );
const NotFound = view( 'NotFound' );
const Playlist = view( 'Playlist' );
const Playlists = view( 'Playlists' );
const Search = view( 'Search' );
const Settings = view( 'Settings' );
const Tag = view( 'Tag' );
const Tags = view( 'Tags' );
const Tree = view( 'Tree' );
const Watch = view( 'Watch' );


export function Routing () {
  return (
    <Suspense fallback= { <Loading className= 'min-h-[50vh]' /> }>
      <Routes>
        <Route path= '/tree' element= { <Tree /> } />
        <Route path= '/all/:rootId/:directoryId' element= { <Media /> } />
        <Route path= '/all/:rootId' element= { <Media /> } />
        <Route path= '/all' element= { <Media /> } />
        <Route path= '/search' element= { <Search /> } />

        <Route path= '/categories' element= { <Categories /> } />
        <Route path= '/category/:id' element= { <Category /> } />
        <Route path= '/tags' element= { <Tags /> } />
        <Route path= '/tag/:id' element= { <Tag /> } />

        <Route path= '/watch/:id' element= { <Watch /> } />
        <Route path= '/watch/:id/:playlistId' element= { <Watch /> } />
        <Route path= '/edit/:id' element= { <Editor /> } />

        <Route path= '/favorites' element= { <Favorites /> } />
        <Route path= '/markers' element= { <Markers /> } />
        <Route path= '/history' element= { <History /> } />

        <Route path= '/playlist/:playlistId' element= { <Playlist /> } />
        <Route path= '/playlists' element= { <Playlists /> } />

        <Route path= '/help' element= { <Help /> } />

        <Route path= '/me' element= { <Account /> } />
        <Route path= '/settings' element= { <Settings /> } />
        <Route path= '/server' element= { <Admin /> } />

        <Route path= '/' element= { <Home /> } />
        <Route path= '*' element= { <NotFound /> } />
      </Routes>
    </Suspense>
  );
}
