import { useApi } from '@/src/client/context/ApiContext';
import type { MediaRecord } from '@/src/shared/types/media';
import { useEffect, useState } from 'react';


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
    <></>
  );
}
