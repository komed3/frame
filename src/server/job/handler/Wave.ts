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
  }
}
