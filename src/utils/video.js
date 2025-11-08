import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import ffmpeg from 'fluent-ffmpeg';

export async function fileHash ( file ) {

    return new Promise ( ( resolve, reject ) => {

        const hash = createHash( 'sha256' );
        const stream = createReadStream( file );

        stream.on( 'data', chunk => hash.update( chunk ) );
        stream.on( 'error', err => reject( err ) );
        stream.on( 'end', () => resolve( hash.digest( 'hex' ) ) );

    } );

}

export async function fileMeta ( file ) {

    // Will extract video metadata using ffprobe
    // This includes format, streams, duration, size, bitrate, video and audio codec info

    return new Promise ( ( resolve, reject ) => {
        ffmpeg.ffprobe( file, ( err, meta ) => {

            // Reject error
            if ( err ) return reject( err );

            // Normalize some useful fields
            const format = meta.format || {};
            const streams = meta.streams || [];
            const videoStream = streams.find( s => s.codec_type === 'video' ) || {};
            const audioStream = streams.find( s => s.codec_type === 'audio' ) || {};

            // Get video sizes
            const duration = parseFloat( format.duration ) || 0;
            const size = parseInt( format.size || 0, 10 );
            const bitrate = parseInt( format.bit_rate || 0, 10 );

            // Try to compute fps safely
            let fps = null;

            if ( videoStream.r_frame_rate ) {
                try { fps = eval( videoStream.r_frame_rate ) }
                catch ( e ) { fps = null }
            }

            resolve( {
                format, streams, duration, size, bitrate,
                video: {
                    codec: videoStream.codec_name,
                    width: videoStream.width,
                    height: videoStream.height,
                    fps: fps
                },
                audio: {
                    codec: audioStream.codec_name,
                    channels: audioStream.channels,
                    sample_rate: audioStream.sample_rate
                }
            } );

        } );
    } );

}
