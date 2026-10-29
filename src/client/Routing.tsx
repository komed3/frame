import { Account } from '@/src/client/views/Account';
import { Admin } from '@/src/client/views/Admin';
import { Editor } from '@/src/client/views/Editor';
import { Media } from '@/src/client/views/Media';
import { NotFound } from '@/src/client/views/NotFound';
import { Search } from '@/src/client/views/Search';
import { Watch } from '@/src/client/views/Watch';
import { Route, Routes } from 'react-router';


export function Routing () {
  return (
    <Routes>
      <Route path= '/all/:rootId/:directoryId' element= { <Media /> } />
      <Route path= '/all/:rootId' element= { <Media /> } />
      <Route path= '/all' element= { <Media /> } />
      <Route path= '/search' element= { <Search /> } />
      <Route path= '/watch/:id' element= { <Watch /> } />
      <Route path= '/edit/:id' element= { <Editor /> } />

      <Route path= '/me' element= { <Account /> } />
      <Route path= '/server' element= { <Admin /> } />

      <Route path= '/' element= { <></> } />
      <Route path= '*' element= { <NotFound /> } />
    </Routes>
  );
}
