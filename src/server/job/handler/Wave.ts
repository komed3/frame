import { Config } from '@/src/server/core/Config';
import { MediaAssets } from '@/src/server/media/Assets';
import { getAssetSource, assetPath } from '@/src/server/job/handler/assets';
import type { JobContext, JobHandler } from '@/src/shared/types/job';
import { spawn } from 'node:child_process';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';


const waveformRate = 8000;


export class WaveJob implements JobHandler {
  public async execute ( { job, signal }: JobContext ) : Promise< void > {
    if ( job.kind !== 'wave' ) throw new Error( 'Invalid waveform job' );

    const source = await getAssetSource( job, signal );
    if ( ! source || ! [ 'video', 'audio' ].includes( source.media.type ) ) return;

    const { media, path } = source;
    const durationSeconds = Math.max( 0, ( media.durationMs ?? 0 ) / 1000 );
    if ( ! durationSeconds ) throw new Error( `Audio duration is unknown: ${ media.id }` );

    const child = spawn( 'ffmpeg', [
      '-hide_banner', '-loglevel', 'error', '-nostdin', '-protocol_whitelist', 'file,pipe',
      '-max_alloc', '536870912', '-i', path, '-t', durationSeconds.toFixed( 3 ), '-map', '0:a:0',
      '-vn', '-ac', '1', '-ar', String( waveformRate ), '-f', 'f32le', 'pipe:1'
    ], { stdio: [ 'ignore', 'pipe', 'pipe' ] } );

    const timeoutMs = Config.get( 'WAVE_TIMEOUT_MS' );
    let timedOut = false, closed = false, stderr = '';
    let killTimer: ReturnType< typeof setTimeout > | undefined;

    const timeout = setTimeout( () => { timedOut = true, child.kill( 'SIGKILL' ) }, timeoutMs );
    timeout.unref();

    child.stderr.setEncoding( 'utf8' );
    child.stderr.on( 'data', ( chunk: string ) => { stderr = ( stderr + chunk ).slice( -16_384 ) } );

    const values: Array< [ number, number ] > = [];
    const targetPoints = Math.min( 1.5e6, Math.max( 8000, Math.ceil( durationSeconds * 100 ) ) );
    const samplesPerPoint = Math.max( 1, Math.ceil( waveformRate * durationSeconds / targetPoints ) );
    let min = Infinity, max = -Infinity, samples = 0;
    let carry = Buffer.alloc( 0 );

    const writePoint = () => {
      if ( ! samples ) return;
      if ( values.length < targetPoints ) values.push( [ min, max ] );
      min = Infinity, max = -Infinity, samples = 0;
    };

    const exitPromise = new Promise< number >( ( resolve, reject ) => {
      child.once( 'error', reject );
      child.once( 'close', code => { closed = true; resolve( code ?? -1 ) } );
    } );

    const abortChild = () => {
      if ( closed ) return;

      child.kill( 'SIGTERM' );
      killTimer = setTimeout( () => { if ( ! closed ) child.kill( 'SIGKILL' ) }, 5000 );
      killTimer.unref();
    };

    signal.addEventListener( 'abort', abortChild, { once: true } );
    if ( signal.aborted ) abortChild();

    try {
      for await ( const chunk of child.stdout ) {
        signal.throwIfAborted();

        const buffer = carry.length ? Buffer.concat( [ carry, chunk as Buffer ] ) : chunk as Buffer;
        const completeLength = buffer.length - buffer.length % 4;

        for ( let offset = 0; offset < completeLength; offset += 4 ) {
          const sample = buffer.readFloatLE( offset );
          if ( ! Number.isFinite( sample ) ) throw new Error( `Invalid audio sample for media ${ media.id }` );

          const value = Math.max( -1, Math.min( 1, sample ) );
          min = Math.min( min, value ), max = Math.max( max, value );
          if ( ++samples >= samplesPerPoint ) writePoint();
        }

        carry = Buffer.from( buffer.subarray( completeLength ) );
      }

      signal.throwIfAborted();
      if ( carry.length ) throw new Error( `Incomplete waveform sample for media ${ media.id }` );
      writePoint();

      const exitCode = await exitPromise;
      signal.throwIfAborted();

      if ( timedOut || exitCode !== 0 ) throw new Error(
        `FFmpeg waveform failed for media ${ media.id } (exit ${ exitCode }): ${ stderr.trim() }`
      );

      if ( ! values.length ) throw new Error( `No audio samples generated for media ${ media.id }` );
    } catch ( err ) {
      abortChild();

      try { await exitPromise }
      catch { /* The child could not be started. */ }

      throw err;
    } finally {
      signal.removeEventListener( 'abort', abortChild );
      clearTimeout( timeout );

      if ( killTimer ) clearTimeout( killTimer );
    }
  }
}
