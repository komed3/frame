import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const INDEX_FILE = join( process.cwd(), 'media', 'search_index.json' );

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

        await mkdir( INDEX_FILE, { recursive: true } );
        await writeFile( INDEX_FILE, JSON.stringify( this.index, null, 2 ) );

    }

    async addVideo ( videoId, videoData ) {

        if ( ! this.index ) await this.init();

        // Store basic video info
        this.index.videos[ videoId ] = { id: videoId, ...videoData };

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

    async findByHash ( hash ) {

        if ( ! this.index ) await this.init();
        return this.index.hashes[ hash ];

    }

    async search ( query ) {

        if ( ! this.index ) await this.init();
        if ( ! query ) return Object.values( this.index.videos );

        query = query.toLowerCase();
        const results = new Set();

        // Search in video titles and authors
        for ( const videoId in this.index.videos ) {

            const video = this.index.videos[ videoId ];

            if ( video.title.toLowerCase().includes( query ) || video.author.toLowerCase().includes( query ) ) {
                results.add( videoId );
            }

        }

        // Search in tags
        for ( const tag in this.index.tags ) {

            if ( tag.toLowerCase().includes( query ) ) {
                this.index.tags[ tag ].forEach( id => results.add( id ) );
            }

        }

        // Search in categories
        for ( const category in this.index.categories ) {

            if ( category.toLowerCase().includes( query ) ) {
                this.index.categories[ category ].forEach( id => results.add( id ) );
            }

        }

        return Array.from( results ).map( id => this.index.videos[ id ] );

    }

}

export const searchIndex = new SearchIndex();
