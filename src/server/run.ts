import { config } from 'dotenv';
import express from 'express';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';


const __dirname = dirname( fileURLToPath( import.meta.url ) );
config( { quiet: true } );
