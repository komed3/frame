import { MediaRating } from '@/src/client/components/MediaRating';
import { useApi } from '@/src/client/context/ApiContext';
import { useApiData } from '@/src/client/hooks/useApiData';
import type { MediaRecord } from '@/src/shared/types/media';
import { HeartIcon, ListVideoIcon, SettingsIcon } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';


interface MediaActionsProps {
  media: MediaRecord;
}


export function MediaActions ( { media }: MediaActionsProps ) {
  const { canEdit, favorites } = useApi();
  const { data, loading } = useApiData< boolean >( media.id, () =>
    favorites.has( media.id ).then( res => res.favorite ).catch( () => false )
  );

  const [ favoriteOverride, setFavoriteOverride ] = useState< { id: string; value: boolean } | null >( null );
  const [ updating, setUpdating ] = useState( false );
  const favorite = favoriteOverride?.id === media.id ? favoriteOverride.value : data ?? false;


  const toggleFavorite = async () => {
    if ( updating || loading ) return;
    setUpdating( true );

    try {
      if ( favorite ) await favorites.remove( media.id );
      else await favorites.add( media.id );

      setFavoriteOverride( { id: media.id, value: ! favorite } );
    } finally {
      setUpdating( false );
    }
  };


  return (
    <div className= 'flex flex-wrap items-center gap-4'>
      { canEdit && (
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
      ) }

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

      <div className= 'flex-1' />

      <div className= 'flex items-center gap-4'>
        <span className= 'text-xs uppercase tracking-wider text-slate-400'>
          Rating
        </span>

        <MediaRating media= { media } />
      </div>
    </div>
  );
}
