import type { MediaRecord } from '@/src/shared/types/media';
import { StarIcon } from 'lucide-react';


interface MediaRatingProps {
  media: MediaRecord;
}


export function MediaRating ( { media }: MediaRatingProps ) {
  const rating = Math.round( Math.min( 10, Math.max( 0, media.rating ?? 0 ) ) );

  return (
    <div className= 'flex items-center space-x-2'>
      { Array.from( { length: 5 }, ( _, i ) => {
        const starValue = ( i + 1 ) * 2, full = rating >= starValue, half = rating === starValue - 1;

        return (
          <span key= { i } className= 'relative inline-block size-5'>
            <StarIcon size= { 20 } className= 'absolute inset-0' />
            { ( full || half ) && (
              <span className= 'absolute inset-0 overflow-hidden' style= { { width: full ? '100%' : '50%' } }>
                <StarIcon size= { 20 } fill= 'currentColor' />
              </span>
            ) }
          </span>
        );
      } ) }
    </div>
  );
}
