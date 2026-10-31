export interface WaveformData {
  samples: Int16Array;
  duration: number;
}


export function parseWaveform ( buffer: ArrayBuffer ): WaveformData | null {
  if ( buffer.byteLength < 24 || new TextDecoder().decode( new Uint8Array( buffer, 0, 8 ) ) !== 'FRMWAV1\0' )
    return null;
}
