import { Account } from '@/src/client/views/Account';
import { Admin } from '@/src/client/views/Admin';
import { Categories } from '@/src/client/views/Categories';
import { Category } from '@/src/client/views/Category';
import { Editor } from '@/src/client/views/Editor';
import { Favorites } from '@/src/client/views/Favorites';
import { Media } from '@/src/client/views/Media';
import { NotFound } from '@/src/client/views/NotFound';
import { Search } from '@/src/client/views/Search';
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

      <Route path= '/me' element= { <Account /> } />
      <Route path= '/server' element= { <Admin /> } />

      <Route path= '/' element= { <></> } />
      <Route path= '*' element= { <NotFound /> } />
    </Routes>
  );
}
