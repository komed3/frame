import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { media } from './config.js';

const LIST_FILE = join( media, 'list.json' );

class Playlist {

    constructor () {

        this.lists = null;
        this.init();

    }

    async init () {

        try {

            const data = await readFile( LIST_FILE, 'utf8' );
            this.lists = JSON.parse( data );

        } catch {

            this.lists = { lists: {} };
            await this.save();

        }

    }

    async save () {

        await mkdir( media, { recursive: true } );
        await writeFile( LIST_FILE, JSON.stringify( this.lists, null, 2 ) );

    }

}

export const playlist = new Playlist();
