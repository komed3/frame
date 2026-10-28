import { useApi } from '@/src/client/context/ApiContext';
import type { MediaRecord } from '@/src/shared/types/media';
import { HeartIcon, ListVideoIcon, SettingsIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router';


interface MediaActionsProps {
  media: MediaRecord;
}


export function MediaActions ( { media }: MediaActionsProps ) {
  const { favorites } = useApi();

  const [ favorite, setFavorite ] = useState( false );
  const [ loading, setLoading ] = useState( true );
  const [ updating, setUpdating ] = useState( false );


  useEffect( () => {
    setLoading( true );
    let active = true;

    favorites.has( media.id )
      .then( res => { if ( active ) setFavorite( res.favorite ) } )
      .catch( () => { if ( active ) setFavorite( false ) } )
      .finally( () => { if ( active ) setLoading( false ) } );

    return () => { active = false };
  }, [ media.id, favorites ] );


  const toggleFavorite = async () => {
    if ( updating || loading ) return;
    setUpdating( true );

    try {
      if ( favorite ) await favorites.remove( media.id );
      else await favorites.add( media.id );

      setFavorite( ! favorite );
    } finally {
      setUpdating( false );
    }
  };


  return (
    <div className= 'flex flex-wrap items-center gap-4'>
      <Link
        to= { `/edit/${ media.id }` }
        className= {
          'flex items-center gap-2.5 h-10 px-5 text-[15px] font-medium bg-slate-50/10 ' +
          'rounded-full transition duration-100 hover:bg-slate-50/20'
        }
      >
        <SettingsIcon size= { 16 } />
        <span>Edit</span>
      </Link>

      <button
        aria-pressed= { favorite }
        disabled= { loading || updating }
        onClick= { toggleFavorite }
        className= {
          'flex items-center gap-2.5 h-10 px-5 text-[15px] font-medium bg-slate-50/10 ' +
          'rounded-full transition duration-100 hover:bg-slate-50/20 disabled:opacity-50'
        }
      >
        <HeartIcon size= { 18 } fill= { favorite ? 'currentColor' : 'none' } />
        <span>{ favorite ? 'Favorite' : 'Add to favourites' }</span>
      </button>

      <button
        className= {
          'flex items-center gap-2.5 h-10 px-5 text-[15px] font-medium bg-slate-50/10 ' +
          'rounded-full transition duration-100 hover:bg-slate-50/20'
        }
      >
        <ListVideoIcon size= { 18 } />
        <span>Playlists</span>
      </button>
    </div>
  );
}
