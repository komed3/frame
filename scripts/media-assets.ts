import { closeDatabase, db } from '../src/server/db';
import { enqueueJob } from '../src/server/jobs/queue';


interface MediaAssetSource {
  id: number;
  media_type: 'video' | 'audio' | 'image' | 'text' | 'other';
  file_name: string;
  audio_codec: string | null;
}


function main () : void {
  const media = db.prepare( `
    SELECT id, media_type, file_name, audio_codec
    FROM media
    WHERE is_available = 1
      AND media_type IN ( 'video', 'audio', 'image' )
    ORDER BY id
  ` ).all() as unknown as MediaAssetSource[];

  let queued = 0;

  for ( const item of media ) {
    if ( item.media_type === 'video' ) {
      enqueueJob( item.id, 'poster', 5 );
      enqueueJob( item.id, 'scrubber', 5 );
      queued += 2;

      if ( item.audio_codec ) {
        enqueueJob( item.id, 'waveform', 5 );
        queued++;
      }
    } else if ( item.media_type === 'audio' ) {
      if ( item.audio_codec ) {
        enqueueJob( item.id, 'waveform', 5 );
        queued++;
      }
    } else if (
      item.media_type === 'image' &&
      ! item.file_name.toLowerCase().endsWith( '.svg' )
    ) {
      enqueueJob( item.id, 'image_preview', 5 );
      queued++;
    }
  }

  console.log( `Media asset jobs submitted: ${ queued }` );
  if ( queued === 0 ) console.log( 'Nothing to do.' );
}


try { main() }
catch ( error ) {
  console.error( error );
  process.exitCode = 1;
}
finally { closeDatabase() }
