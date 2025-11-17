import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
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

            lists.push( {
                id: id, name: name, count: videos.length,
                selected: videoId && videos.includes( videoId ),
                poster: videos[ 0 ] + '/poster.jpg'
            } );

        }

        return lists;

    }

    async getList ( id, videoData = false ) {

        if ( ! this.lists ) await this.init();

        const list = structuredClone( this.lists.lists[ id ] );

        if ( list && videoData ) for ( const [ i, v ] of Object.entries( list.videos ) ) {
            list.videos[ i ] = await searchIndex.getVideo( v );
        }

        return list;

    }

    async createList ( name = 'Untitled', videos = [] ) {

        if ( ! this.lists ) await this.init();

        const id = uuidv4();
        const list = {
            id, name: String( name ),
            created: new Date().toISOString(),
            videos: videos
        };

        this.lists.lists[ id ] = list;
        await this.save();

        return { id, list };

    }

    async deleteList ( id ) {

        if ( ! this.lists ) await this.init();

        delete this.lists.lists[ id ];
        await this.save();

    }

    async renameList ( id, name ) {

        if ( ! this.lists ) await this.init();

        if ( id in this.lists.lists ) {

            this.lists.lists[ id ].name = String( name );
            await this.save();

        }

    }

    async addToList( id, videos ) {

        if ( ! this.lists ) await this.init();

        if ( id in this.lists.lists ) {

            this.lists.lists[ id ].videos.push( ...videos );
            await this.save();

        }

    }

    async removeFromList( id, videos ) {

        if ( ! this.lists ) await this.init();

        if ( id in this.lists.lists ) {

            this.lists.lists[ id ].videos = this.lists.lists[ id ].videos.filter( v => ! videos.includes( v ) );
            await this.save();

        }

    }

}

export const playlist = new Playlist();
