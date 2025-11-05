import { spawn } from 'node:child_process';
import { join } from 'node:path';
import ffmpeg from 'fluent-ffmpeg';

export async function extractMeta ( file ) {

    return new Promise( ( resolve, reject ) => {
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

export async function createWaveform ( file ) {}

export async function createPreview ( file ) {}
