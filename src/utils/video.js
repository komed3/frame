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

export async function getWaveform ( file, meta, targetPoints = 200 ) {

    // Create a very low-sample-rate mono PCM stream so we end up with roughly targetPoints samples
    // This will used to show an audio waveform preview on the video seekbar

    // Target total samples approximate targetPoints
    const duration = meta.duration || 0;
    const sampleRate = Math.max( 1, Math.round( targetPoints / duration ) );

    return new Promise ( ( resolve, reject ) => {

        const ff = spawn( 'ffmpeg', [
            '-hide_banner',
            '-loglevel', 'error',
            '-i', file,
            '-vn',
            '-ac', '1',
            '-ar', String( sampleRate ),
            '-f', 's16le',
            'pipe:1'
        ] );

        const chunks = [];
        ff.stdout.on( 'data', c => chunks.push( c ) );
        ff.on( 'error', reject );

        ff.on( 'close', code => {

            if ( code !== 0 && code !== null ) return reject(
                new Error( 'ffmpeg failed to generate waveform' )
            );

            const buffer = Buffer.concat( chunks );
            const sampleCount = Math.floor( buffer.length / 2 ); // 16-bit samples
            const samples = new Array( sampleCount );
            
            // First pass to collect raw values
            for ( let i = 0; i < sampleCount; i++ ) {
                samples[ i ] = Math.abs( buffer.readInt16LE( i * 2 ) );
            }

            // Reduce to targetPoints by averaging groups
            const points = [];
            const groupSize = Math.max( 1, Math.floor( sampleCount / targetPoints ) );

            for ( let i = 0; i < sampleCount; i += groupSize ) {

                let sum = 0, count = 0;

                for ( let j = i; j < Math.min( i + groupSize, sampleCount ); j++ ) {

                    sum += samples[ j ];
                    count++;

                }

                points.push( count ? sum / count : 0 );

            }

            // Normalize to 0-100 range
            const max = Math.max( 1, Math.max( ...points ) );
            const normalized = points.map( p => Math.round( ( p / max ) * 100 ) );

            // Ensure exactly targetPoints length
            while ( normalized.length > targetPoints ) normalized.pop();
            while ( normalized.length < targetPoints ) normalized.push( 0 );

            resolve( normalized );

        } );

    } );

}
