import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { media } from './config.js';

const INDEX_FILE = join( media, 'index.json' );

class SearchIndex {

    constructor () {

        this.index = null;
        this.init();

    }

    async init () {

        try {

            const data = await readFile( INDEX_FILE, 'utf8' );
            this.index = JSON.parse( data );

        } catch {

            this.index = { videos: {}, hashes: {}, tags: {}, categories: {} };
            await this.save();

        }

    }

    async save () {

        await mkdir( media, { recursive: true } );
        await writeFile( INDEX_FILE, JSON.stringify( this.index, null, 2 ) );

    }

    textIndex ( obj ) {

        const collect = ( v ) => typeof v === 'string' ? [ v ]
            : v && typeof v === 'object' ? Object.values( v ).flatMap( collect )
            : [];

        return collect( obj ).join( ' ' ).trim().toLowerCase();

    }

    async addVideo ( videoId, videoData ) {

        if ( ! this.index ) await this.init();

        // Store basic video info + searchable text index
        this.index.videos[ videoId ] = { id: videoId, index: this.textIndex( videoData ), ...videoData };

        // Store hash reference
        if ( videoData.hash ) this.index.hashes[ videoData.hash ] = videoId

        // Store category reference
        if ( videoData.category ) {

            if ( ! this.index.categories[ videoData.category ] ) this.index.categories[ videoData.category ] = [];
            this.index.categories[ videoData.category ].push( videoId );

        }

        // Store tag references
        if ( videoData.tags && videoData.tags.length ) {

            for ( const tag of videoData.tags ) {

                if ( !this.index.tags[ tag ] ) this.index.tags[ tag ] = [];
                this.index.tags[ tag ].push( videoId );

            }

        }

        await this.save();

    }

    async removeVideo ( videoId ) {

        if ( ! this.index ) await this.init();

        const videoData = this.index.videos[ videoId ];
        if ( ! videoData ) return;

        delete this.index.videos[ videoId ];

        // Remove hash reference
        if ( videoData.hash ) delete this.index.hashes[ videoData.hash ];

        // Remove category reference
        if ( videoData.category ) this.index.categories[ videoData.category ] =
            this.index.categories[ videoData.category ].filter( id => id !== videoId );

        // Remove tag references
        if ( videoData.tags && videoData.tags.length ) {

            for ( const tag of videoData.tags ) this.index.tags[ tag ] =
                this.index.tags[ tag ].filter( id => id !== videoId );

        }

        await this.save();

    }

    async getVideo ( videoId ) {

        if ( ! this.index ) await this.init();
        return this.index.videos[ videoId ];

    }

    async findByHash ( hash ) {

        if ( ! this.index ) await this.init();
        return this.index.hashes[ hash ];

    }

    async findByCategory ( cat ) {

        if ( ! this.index ) await this.init();
        return this.index.categories[ cat ] || [];

    }

    async findByTag ( tag ) {

        if ( ! this.index ) await this.init();
        return this.index.tags[ tag ] || [];

    }

    async findByField ( field, value ) {

        if ( ! this.index ) await this.init();

        value = value.toLowerCase();

        return Object.values( this.index.videos ).filter(
            video => video[ field ].toLowerCase() === value
        );

    }

    async search ( query ) {

        if ( ! this.index ) await this.init();
        if ( ! query ) return Object.values( this.index.videos );

        query = query.toLowerCase();

        return Object.values( this.index.videos ).filter(
            video => video.index.includes( query )
        );

    }

}

export const searchIndex = new SearchIndex();
