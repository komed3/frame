import { db } from '@/src/server/db';
import type { MediaJob, MediaMetadata, MediaSourceRecord } from '@/src/shared/types';
import { execFile } from 'node:child_process';
import { open, stat } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import { promisify } from 'node:util';


interface ProbeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  bit_rate?: string;
  sample_rate?: string;
  channels?: number;
  disposition?: { attached_pic?: number };
  tags?: Record< string, string >;
}

interface ProbeData {
  streams?: ProbeStream[];
  format?: {
    format_name?: string;
    duration?: string;
    bit_rate?: string;
    tags?: Record< string, string >;
  };
}


const execFileAsync = promisify( execFile );


class MetadataProcessor {}


export const metadataProcessor = new MetadataProcessor();
export const processMetadataJob = ( job: MediaJob ) : Promise< void > =>
  metadataProcessor.process( job );
