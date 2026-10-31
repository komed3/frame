export interface WaveformData {
  samples: Int16Array;
  duration: number;
}


export function parseWaveform ( buffer: ArrayBuffer ): WaveformData | null {
  if ( buffer.byteLength < 24 || new TextDecoder().decode( new Uint8Array( buffer, 0, 8 ) ) !== 'FRMWAV1\0' ) return null;

  const view = new DataView( buffer ), count = view.getUint32( 12, true ), duration = view.getFloat64( 16, true );
  if ( ! count || ! Number.isFinite( duration ) || duration <= 0 || buffer.byteLength < 24 + count * 4 ) return null;

  const samples = new Int16Array( count * 2 );
  for ( let i = 0; i < samples.length; i++ ) samples[ i ] = view.getInt16( 24 + i * 2, true );
  return { samples, duration };
}
