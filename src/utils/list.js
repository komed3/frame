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

    async listIndex ( videoId = null ) {

        if ( ! this.lists ) await this.init();

        const lists = [];

        for ( const [ id, { name, videos } ] of Object.entries( this.lists.lists ) ) {
            lists.push( { id: id, name: name, selected: videoId && videos.includes( videoId ) } );
        }

        return lists;

    }

    async getList ( listId, videoData = false ) {

        if ( ! this.lists ) await this.init();

        const list = structuredClone( this.lists.lists[ listId ] );

        if ( list && videoData ) for ( const [ i, v ] of Object.entries( list.videos ) ) {
            list.videos[ i ] = await searchIndex.getVideo( v );
        }

        return list;

    }

}

export const playlist = new Playlist();
