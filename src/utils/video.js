import { execFile, spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createReadStream, readdir } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import ffmpeg from 'fluent-ffmpeg';
import multer from 'multer';
import ShortUniqueId from 'short-unique-id';
import { searchIndex } from './search.js';

// Init ID generator
const uid = new ShortUniqueId( { dictionary: 'alphanum', length: 10 } );

export const uploadVideo = multer( {
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 * 1024 },
    fileFilter: ( _, file, cb ) => {
        if ( file.mimetype && file.mimetype.startsWith( 'video/' ) ) cb( null, true );
        else cb( new Error( 'Invalid file type' ) );
    }
} ).single( 'video' );

export async function generateId () {

    let id;

    do { id = uid.rnd() }
    while ( await searchIndex.getVideo( id ) );

    return id;

}

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

export async function createSegments ( file, outDir, meta ) {

    // Create HLS video segments for adaptive streaming
    // Will create .m3u8 playlist and .ts segment files in outDir

    const duration = meta.duration || 0;
    const segment = Math.max( 6, Math.min( 30, Math.round( ( duration / 200 ) / 6 ) * 6 ) );

    await promisify( execFile )( 'ffmpeg', [
        '-i', file, '-c:v', 'copy', '-c:a', 'copy', '-movflags', '+faststart',
        '-hls_time', segment, '-hls_playlist_type', 'vod',
        '-hls_segment_filename', join( outDir, '%04d.ts' ),
        join( outDir, 'output.m3u8' )
    ] );

}

export async function getWaveform ( file, meta, targetPoints = 400 ) {

    // Create a very low-sample-rate mono PCM stream so we end up with roughly targetPoints samples
    // This will used to show an audio waveform preview on the video seekbar

    // Target total samples approximate targetPoints
    const duration = meta.duration || 0;
    const sampleRate = Math.max( 1, Math.round( targetPoints / duration ) );

    return new Promise ( ( resolve, reject ) => {

        // Spawn ffmpeg to output raw PCM data
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
            const groupSize = Math.max( 1, Math.floor( sampleCount / targetPoints ) );
            const points = Array.from( { length: Math.ceil( sampleCount / groupSize ) }, ( _, i ) => {
                const group = samples.slice( i * groupSize, ( i + 1 ) * groupSize );
                return group.length ? group.reduce( ( a, b ) => a + b ) / group.length : 0;
            } );

            
            // Normalize to 0-100 range
            const max = Math.max( 1, ...points );
            const normalized = points.map( p => Math.round( ( p / max ) * 100 ) ).slice( 0, targetPoints );

            // Ensure exactly targetPoints length
            while ( normalized.length < targetPoints ) normalized.push( 0 );

            resolve( normalized );

        } );

    } );

}

export async function createThumbnail ( file, outDir, meta ) {

    // Create a single thumbnail image at specified time (in seconds)

    const duration = meta.duration || 0;

    await promisify( execFile )( 'ffmpeg', [
        '-hide_banner',
        '-loglevel', 'error',
        '-ss', String( duration * 0.25 ),
        '-i', file,
        '-vframes', '1',
        '-qscale:v', '2',
        join( outDir, `poster.jpg` )
    ] );

}

export async function createPreview ( file, outDir, meta, n = 100 ) {

    // Create approx. n thumbnails to provide video previews
    // Will be used on hovering player seekbar

    const duration = meta.duration || 0;
    const intervalSeconds = Math.round( duration / n );

    // Generate preview thumbnails using ffmpeg
    await promisify( execFile )( 'ffmpeg', [
        '-hide_banner',
        '-loglevel', 'error',
        '-i', file,
        '-vf', `fps=1/${intervalSeconds},scale=256:-1`,
        '-qscale:v', '2',
        join( outDir, `%04d.jpg` )
    ] );

    // Collect generated thumbnail file names synchronously
    const files = await promisify( readdir )( outDir );
    const thumbnails = files.filter( f => f.endsWith( `.jpg` ) ).sort();

    return thumbnails;

}
