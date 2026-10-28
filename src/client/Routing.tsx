import { Media } from '@/src/client/views/Media';
import { NotFound } from '@/src/client/views/NotFound';
import { Search } from '@/src/client/views/Search';
import { Route, Routes } from 'react-router';


export function Routing () {
  return (
    <Routes>
      <Route path= '/all/:rootId/:directoryId' element= { <Media /> } />
      <Route path= '/all/:rootId' element= { <Media /> } />
      <Route path= '/all' element= { <Media /> } />
      <Route path= '/search' element= { <Search /> } />

      <Route path= '/' element= { <></> } />
      <Route path= '*' element= { <NotFound /> } />
    </Routes>
  );
}
