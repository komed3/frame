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

export async function createWaveform ( file, duration, targetPoints = 150 ) {

    // Create a very low-sample-rate mono PCM stream so we end up with roughly targetPoints samples
    // First determine duration to compute approximate sample rate

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

            // Ensure we return exactly targetPoints (pad or trim)
            if ( points.length > targetPoints ) points.length = targetPoints;
            while ( points.length < targetPoints ) points.push( 0 );

            resolve( points );

        } );

    } );

}

export async function createPreview ( file, outDir, baseName, duration, intervalSeconds = 5 ) {

    // Create thumbnails every n seconds to provide video previews
    // Will be used on hovering player scrubber

    const thumbs = [];
    const ts = [];

    // Compute timestamps
	for ( let t = 0; t < duration; t += intervalSeconds ) ts.push(
        Math.min( Math.floor( t ), Math.floor( duration - 0.1 ) )
    );

    // Limit to reasonable number
	const maxThumbs = 120;

    if ( ts.length > maxThumbs ) {

		const step = Math.ceil( ts.length / maxThumbs );
		const reduced = [];

        for ( let i = 0; i < ts.length; i += step ) reduced.push( ts[ i ] );

        ts.length = 0; ts.push( ...reduced );

    }

    // Generate thumbnails sequentially to avoid heavy parallel ffmpeg load
    for ( let i = 0; i < ts.length; i++ ) {

        const t = ts[ i ];
        const outName = `${ baseName }_thumb_${ String( i ).padStart( 4, '0' ) }.jpg`;
        const outPath = join( outDir, outName );

        // Use ffmpeg to grab frame at time t
        await new Promise( ( resolve, reject ) => {
            ffmpeg( file )
                .outputOptions( [ '-ss', String( t ) ] )
                .frames( 1 )
                .outputOptions( '-qscale:v 2' )
                .size( '1280x?' )
                .save( outPath )
                .on( 'end', () => resolve() )
                .on( 'error', err => reject( err ) );
        } );
    
        thumbs.push( outName );

    }

    return thumbs;

}
