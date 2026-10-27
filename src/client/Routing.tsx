import { Media } from '@/src/client/views/Media';
import { Route, Routes } from 'react-router';


export function Routing () {
  return (
    <Routes>
      <Route path= '/all' element= { <Media /> } />

      <Route path= '/' element= { <></> } />
      <Route path= '*' element= { <></> } />
    </Routes>
  );
}
