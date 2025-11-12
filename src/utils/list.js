import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { media } from './config.js';
import { searchIndex } from './search.js';

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

    async getList ( listId, videoData = false ) {

        if ( ! this.lists ) await this.init();
        const list = this.lists.lists[ listId ];

        if ( list && videoData ) list.videos = await Promise.all( list.videos.map(
            async ( v ) => await searchIndex.getVideo( v )
        ) );

        return list;

    }

}

export const playlist = new Playlist();
