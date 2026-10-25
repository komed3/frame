import type { ReadStream } from 'node:fs';


export interface ByteRange {
  start: number;
  end: number;
}

export interface StreamResult {
  status: number;
  headers: Record< string, string >;
  body: ReadStream | null;
}
