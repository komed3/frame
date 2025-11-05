import { execFile, spawn } from 'node:child_process';
import { readdir } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import ffmpeg from 'fluent-ffmpeg';

const execFileAsync = promisify( execFile );

export async function extractMeta ( file ) {

    // Will extract video metadata using ffprobe
    // This includes format, streams, duration, size, bitrate, video and audio codec info

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

export async function createWaveform ( file, meta, targetPoints = 120 ) {

    // Create a very low-sample-rate mono PCM stream so we end up with roughly targetPoints samples
    // First determine duration to compute approximate sample rate

    const duration = meta.duration || 0;

    // Target total samples approximate targetPoints
    const sampleRate = Math.max( 1, Math.round( targetPoints / duration ) );

    return new Promise( ( resolve, reject ) => {

        const args = [
            '-i', file,
            '-vn',
            '-ac', '1',
            '-ar', String( sampleRate ),
            '-f', 's16le',
            'pipe:1'
        ];

        const ff = spawn( 'ffmpeg', [ '-hide_banner', '-loglevel', 'error', ...args ] );

        const chunks = [];
        ff.stdout.on( 'data', c => chunks.push( c ) );
        ff.on( 'error', reject );

        ff.on( 'close', code => {

            if ( code !== 0 && code !== null ) return reject( new Error( 'ffmpeg failed to generate waveform' ) );

            const buffer = Buffer.concat( chunks );
            const sampleCount = Math.floor( buffer.length / 2 ); // 16-bit samples
            const samples = new Array( sampleCount );
            let max = 1;

            for ( let i = 0; i < sampleCount; i++ ) {

                const val = buffer.readInt16LE( i * 2 );
                const abs = Math.abs( val );
                samples[ i ] = abs;

                if ( abs > max ) max = abs;

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

                const avg = count ? ( sum / count ) : 0;
                points.push( Math.round( ( avg / max ) * 100 ) );

            }

            // Normalize waveform to 0-100
            const finalMax = Math.max( ...points );
            points.map( p => Math.round( ( p / finalMax ) * 100 ) );

            resolve( points );

        } );

    } );

}

export async function createPreview ( file, outDir, baseName, meta ) {

    // Create approx. 100 thumbnails to provide video previews
    // Will be used on hovering player scrubber

    const duration = meta.duration || 0;
    const intervalSeconds = Math.round( duration / 100 );
    const thumbs = [];

    // Generate thumbnails using ffmpeg
    const args = [
        '-hide_banner',
        '-loglevel', 'error',
        '-i', file,
        '-vf', `fps=1/${intervalSeconds},scale=256:-1`,
        '-qscale:v', '2',
        join( outDir, `${baseName}_thumb_%04d.jpg` )
    ];

    // Execute ffmpeg command
    await execFileAsync( 'ffmpeg', args );

    // Collect generated thumbnail file names
    readdir( outDir, ( err, files ) => {

        if ( err ) throw err;

        files.filter(
            f => f.startsWith( `${baseName}_thumb_` ) &&
                 f.endsWith( '.jpg' )
        ).forEach(
            f => thumbs.push( f )
        );

    } );

    return thumbs;

}
