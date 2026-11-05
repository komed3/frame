import { Account } from '@/src/client/views/Account';
import { Admin } from '@/src/client/views/Admin';
import { Categories } from '@/src/client/views/Categories';
import { Category } from '@/src/client/views/Category';
import { Editor } from '@/src/client/views/Editor';
import { Favorites } from '@/src/client/views/Favorites';
import { Help } from '@/src/client/views/Help';
import { History } from '@/src/client/views/History';
import { Home } from '@/src/client/views/Home';
import { Markers } from '@/src/client/views/Markers';
import { Media } from '@/src/client/views/Media';
import { NotFound } from '@/src/client/views/NotFound';
import { Playlist } from '@/src/client/views/Playlist';
import { Playlists } from '@/src/client/views/Playlists';
import { Search } from '@/src/client/views/Search';
import { Settings } from '@/src/client/views/Settings';
import { Tag } from '@/src/client/views/Tag';
import { Tags } from '@/src/client/views/Tags';
import { Tree } from '@/src/client/views/Tree';
import { Watch } from '@/src/client/views/Watch';
import { Route, Routes } from 'react-router';


export function Routing () {
  return (
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

      <Route path= '/playlist/:playlistId' element= { <Playlists /> } />
      <Route path= '/playlists' element= { <Playlist /> } />

      <Route path= '/help' element= { <Help /> } />

      <Route path= '/me' element= { <Account /> } />
      <Route path= '/settings' element= { <Settings /> } />
      <Route path= '/server' element= { <Admin /> } />

      <Route path= '/' element= { <Home /> } />
      <Route path= '*' element= { <NotFound /> } />
    </Routes>
  );
}
