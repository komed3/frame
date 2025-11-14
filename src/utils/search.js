import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { media } from './config.js';

const INDEX_FILE = join( media, 'index.json' );
const HISTORY_FILE = join( media, 'history.json' );

class SearchIndex {

    constructor () {

        this.index = null;
        this.history = null;
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

        try {
            const data = await readFile( HISTORY_FILE, 'utf8' );
            this.history = JSON.parse( data );
        } catch {
            this.history = { videos: [] };
            await this.save();
        }

    }

    async save () {

        await mkdir( media, { recursive: true } );
        await writeFile( INDEX_FILE, JSON.stringify( this.index, null, 2 ) );
        await writeFile( HISTORY_FILE, JSON.stringify( this.history, null, 2 ) );

    }

    async addHistory ( videoId ) {

        if ( ! this.history ) await this.init();
        if ( await this.getLastVideo() != videoId ) this.history.videos.push( videoId );
        await this.save();

    }

    async getHistory ( n = 10 ) {

        if ( ! this.history ) await this.init();
        return this.history.videos.reverse.slice( 0, n );

    }

    async getLastVideo () {

        if ( ! this.history ) await this.init();
        return this.history.videos.at( -1 );

    }

    async addVideo ( videoId, videoData ) {

        if ( ! this.index ) await this.init();

        // Store basic video info + searchable text index
        this.index.videos[ videoId ] = {
            id: videoId, stats: { views: 0, likes: 0, dislikes: 0, rating: null },
            index: [ videoData.title || '', videoData.description || '' ].join( ' ' ).trim().toLowerCase(),
            year: new Date( videoData.date ).getFullYear(),
            ...videoData
        };

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

    async addView ( videoId ) {

        if ( ! this.index ) await this.init();
        const last = await this.getLastVideo();
        if ( this.index.videos[ videoId ] && last != videoId ) this.index.videos[ videoId ].stats.views += 1;
        await this.save();

    }

    #rating ( video ) {

        const { likes = 0, dislikes = 0 } = video.stats ?? {};
        return Number( ( likes / Math.max( 1, likes + dislikes ) * 5 ).toFixed( 3 ) );

    }

    async like ( videoId ) {

        if ( ! this.index ) await this.init();

        const video = this.index.videos[ videoId ];

        if ( ! video ) return false;

        video.stats.likes += 1;
        video.stats.rating = this.#rating( video );
        await this.save();

        return video.stats.rating;

    }

    async dislike ( videoId ) {

        if ( ! this.index ) await this.init();

        const video = this.index.videos[ videoId ];

        if ( ! video ) return false;

        video.stats.dislikes += 1;
        video.stats.rating = this.#rating( video );
        await this.save();

        return video.stats.rating;

    }

    async getRating ( videoId ) {

        if ( ! this.index ) await this.init();
        return this.index.videos[ videoId ]?.stats.rating || null;

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

    async getChannels () {

        if ( ! this.index ) await this.init();
        return [];

    }

    async getCategories () {

        if ( ! this.index ) await this.init();
        return Object.keys( this.index.categories || {} ).sort();

    }

    async getTags () {

        if ( ! this.index ) await this.init();
        return Object.keys( this.index.tags || {} ).sort();

    }

    async getYears () {

        if ( ! this.index ) await this.init();
        return [ ...new Set(
            Object.values( searchIndex.index?.videos || {} )
                  .map( v => v.year ).filter( Boolean )
        ) ].sort().reverse();

    }

    async search ( query, filter, sort = 'date', dir = 'desc' ) {}

    async suggested ( video, n = 4 ) {

        if ( ! this.index ) await this.init();
        if ( ! video || ! video.id ) return [];

        const time = new Date().getTime();
        const expire = time + 1.2e9;

        // Check if video has stored suggestions
        if ( 'suggested' in video && video.suggested.expire > time && video.suggested.items.length >= n ) {
            return await Promise.all( video.suggested.items.slice( 0, n ).map(
                async ( id ) => await this.getVideo( id )
            ) );
        }

        const candidates = Object.values( this.index.videos ).filter( v => v.id !== video.id );

        // Helper: tokenize text into unique words
        const tokenize = s => ( ( s || '' ).toLowerCase().match( /[\p{L}\p{N}]+/gu ) || [] ).map( t => t.trim() ).filter( Boolean );

        const srcTags = new Set( ( video.tags || video.content?.tags || [] ) );
        const srcCategory = video.category || video.content?.category || null;
        const srcIndexText = video.index || [ video.title || '', video.description || '' ].join( ' ' ).toLowerCase();
        const srcTokens = new Set( tokenize( srcIndexText ) );
        const srcYear = video.year || video.date ? ( new Date( video.date || video.created || '' ).getFullYear() || video.year ) : null;
        const srcDuration = video.duration || video.meta?.duration || null;

        const scored = candidates.map( c => {

            let score = 0;

            // Tags: strong signal
            const candTags = new Set( c.tags || c.content?.tags || [] );
            let tagOverlap = 0;
            for ( const t of candTags ) if ( srcTags.has( t ) ) tagOverlap++;
            score += tagOverlap * 40;

            // Category
            if ( srcCategory && c.category === srcCategory ) score += 25;

            // Text token overlap (title/description/index)
            const candTokens = new Set( tokenize( c.index || [ c.title || '', c.description || '' ].join( ' ' ) ) );
            let textOverlap = 0;
            for ( const t of srcTokens ) if ( candTokens.has( t ) ) textOverlap++;
            score += Math.min( 10, textOverlap ) * 6; // cap contribution

            // Year proximity (small bonus for close years)
            const candYear = c.year || c.date ? ( new Date( c.date || c.created || '' ).getFullYear() || c.year ) : null;
            if ( srcYear && candYear ) {
                const diff = Math.abs( srcYear - candYear );
                if ( diff === 0 ) score += 6;
                else if ( diff <= 2 ) score += 3;
            }

            // Duration similarity (small bonus if within 20%)
            const candDuration = c.duration || c.meta?.duration || null;
            if ( srcDuration && candDuration ) {
                const ratio = Math.max( srcDuration, candDuration ) / Math.min( srcDuration, candDuration );
                if ( ratio <= 1.2 ) score += 5;
                else if ( ratio <= 1.5 ) score += 2;
            }

            // Popularity tie-breaker (small)
            const views = c.stats?.views || 0;
            score += Math.log1p( views ) * 0.5;

            return { video: c, score };

        } );

        const items = scored.sort( ( a, b ) => (
            b.score - a.score || ( ( b.video.stats?.views || 0 ) - ( a.video.stats?.views || 0 ) )
        ) ).slice( 0, n ).map( s => s.video );

        this.index.videos[ video.id ].suggested = { expire, items: items.map( i => i.id ) };
        await this.save();

        return items;

    }

}

export const searchIndex = new SearchIndex();
