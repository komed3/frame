import { Config } from '@/src/server/core/Config';
import { db } from '@/src/server/core/Database';
import { Worker } from '@/src/server/job/Worker';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Server } from 'node:http';
import type { ViteDevServer } from 'vite';

import '@/src/server/job/handler';


const __dirname = dirname( fileURLToPath( import.meta.url ) );


async function run () : Promise< void > {
  const host = Config.get( 'HOST' ), port = Config.get( 'PORT' );
  const app = express();
}
