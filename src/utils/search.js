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
            this.index = { videos: {}, hashes: {}, authors: {}, categories: {}, tags: {}, pgs: {}, langs: {} };
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
            index: [ videoData.title || '', videoData.description || '' ].join(' ').trim().toLowerCase(),
            year: new Date( videoData.date ).getFullYear(), ...videoData
        };

        // Store hash reference
        if ( videoData.hash ) this.index.hashes[ videoData.hash ] = videoId;

        // Store references for author, category, PG and language
        const refs = { author: 'authors', category: 'categories', pg: 'pgs', lang: 'langs' };

        for ( const key in refs ) {

            const table = refs[ key ];
            const value = videoData[ key ];
            if ( ! value ) continue;

            if ( ! this.index[ table ][ value ] ) this.index[ table ][ value ] = [];
            this.index[ table ][ value ].push( videoId );

        }

        // Store tag references
        if ( Array.isArray( videoData.tags ) ) {
            for ( const tag of videoData.tags ) {
                if ( ! this.index.tags[ tag ] ) this.index.tags[ tag ] = [];
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

        // Revome references for author, category, PG and language
        const refs = { author: 'authors', category: 'categories', pg: 'pgs', lang: 'langs' };

        for ( const key in refs ) {

            const table = refs[ key ];
            const value = videoData[ key ];

            if ( value && this.index[ table ]?.[ value ] ) {
                this.index[ table ][ value ] = this.index[ table ][ value ].filter( id => id !== videoId );
            }

        }

        // Remove lang reference
        if ( Array.isArray( videoData.tags ) ) {
            for ( const tag of videoData.tags ) if ( this.index.tags?.[ tag ] ) {
                this.index.tags[ tag ] = this.index.tags[ tag ].filter( id => id !== videoId );
            }
        }

        await this.save();

    }

    async getVideo ( videoId ) {

        if ( ! this.index ) await this.init();
        return structuredClone( this.index.videos[ videoId ] );

    }

    async getVideos ( videoIds ) {

        if ( ! this.index ) await this.init();
        return videoIds.map( id => structuredClone( this.index.videos[ id ] ) ).filter( Boolean );

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
        return structuredClone( this.index.hashes[ hash ] );

    }

    async findByAuthor ( author ) {

        if ( ! this.index ) await this.init();
        return structuredClone( this.index.authors[ author ] || [] );

    }

    async findByCategory ( cat ) {

        if ( ! this.index ) await this.init();
        return structuredClone( this.index.categories[ cat ] || [] );

    }

    async findByTag ( tag ) {

        if ( ! this.index ) await this.init();
        return structuredClone( this.index.tags[ tag ] || [] );

    }

    async findByPG ( pg ) {

        if ( ! this.index ) await this.init();
        return structuredClone( this.index.pgs[ pg ] || [] );

    }

    async findByLang ( lang ) {

        if ( ! this.index ) await this.init();
        return structuredClone( this.index.langs[ lang ] || [] );

    }

    async findByField ( field, value ) {

        if ( ! this.index ) await this.init();

        value = value.toLowerCase();

        return structuredClone( Object.values( this.index.videos ).filter(
            video => video[ field ].toLowerCase() === value
        ) );

    }

    async getAuthors () {

        if ( ! this.index ) await this.init();
        return Object.keys( this.index.authors || {} ).sort();

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

    async getPGs () {

        if ( ! this.index ) await this.init();
        return Object.keys( this.index.pgs || {} ).sort();

    }

    async getLangs () {

        if ( ! this.index ) await this.init();
        return Object.keys( this.index.langs || {} ).sort();

    }

    #sortFn ( sort, order ) {

        const dir = order === 'asc' ? 1 : -1;

        const sortFunctions = {
            date: ( a, b ) => ( new Date( b.date || b.created || 0 ).getTime() - new Date( a.date || a.created || 0 ).getTime() ) * dir,
            views: ( a, b ) => ( ( b.stats.views || 0 ) - ( a.stats.views || 0 ) ) * dir,
            rating: ( a, b ) => ( ( b.stats.rating || 0 ) - ( a.stats.rating || 0 ) ) * dir,
            duration: ( a, b ) => ( ( b.duration || 0 ) - ( a.duration || 0 ) ) * dir,
            title: ( a, b ) => ( a.title || '' ).toLowerCase().localeCompare( ( b.title || '' ).toLowerCase() ) * dir
        };

        return sortFunctions[ sort ] || sortFunctions.date;

    }

    async search ( query, options ) {

        if ( ! this.index ) await this.init();

        const { filters = {}, sort = 'date', order = 'desc', offset = 0, limit = 24 } = options;
        let results = Object.values( this.index.videos );

        // Text search
        if ( query ) {
            query = query.toLowerCase();
            results = results.filter( v => v.index.includes( query ) );
        }

        // Apply filters
        if ( filters.author ) results = results.filter( v => v.author === filters.author );
        if ( filters.category ) results = results.filter( v => v.category === filters.category );
        if ( filters.tag ) results = results.filter( v => v.tags.includes( filters.tag ) );
        if ( filters.year ) results = results.filter( v => v.year === parseInt( filters.year ) );
        if ( filters.pg ) results = results.filter( v => v.pg === filters.pg );
        if ( filters.lang ) results = results.filter( v => v.lang === filters.lang );

        // Sorting
        results.sort( this.#sortFn( sort, order ) );

        // Pagination
        const total = results.length;
        const paged = results.slice( offset, offset + limit );

        return { results: paged, total: total, offset, limit };

    }

    async suggested ( video, n = 4 ) {

        if ( ! this.index ) await this.init();
        if ( ! video?.id ) return [];

        const time = Date.now();
        const expire = time + 1.2e9;

        // Return cached suggestions if valid
        if ( video.suggested?.expire > time && video.suggested.items.length >= n ) {
            return Promise.all( video.suggested.items.slice( 0, n ).map( id => this.getVideo( id ) ) );
        }

        const candidates = Object.values( this.index.videos ).filter( v => v.id !== video.id );
        const tokenize = s => ( ( s || '' ).toLowerCase().match( /[\p{L}\p{N}]+/gu ) || [] );

        // Extract source video features
        const src = {
            tags: new Set( video.tags || [] ),
            author: video.author,
            category: video.category,
            tokens: new Set( tokenize( video.index ) ),
            year: video.year || ( video.date && new Date( video.date ).getFullYear() ),
            lang: video.lang
        };

        // Score candidates
        const scored = candidates.map( c => {

            let score = 0;

            // Tags overlap
            score += [ ...new Set( c.tags || [] ) ].filter( t => src.tags.has( t ) ).length * 40;

            // Author, Category
            if ( src.author && c.author === src.author ) score += 15;
            if ( src.category && c.category === src.category ) score += 25;

            // Text overlap
            const cTokens = new Set( tokenize( c.index ) );
            score += Math.min( 10, [ ...src.tokens ].filter( t => cTokens.has( t ) ).length ) * 6;

            // Year proximity
            const cYear = c.year || ( c.date && new Date( c.date ).getFullYear() );
            if ( src.year && cYear ) {
                const diff = Math.abs( src.year - cYear );
                score += diff === 0 ? 6 : diff <= 2 ? 3 : 0;
            }

            // Same language
            if ( c.lang === src.lang ) score += 20;

            // Popularity
            score += Math.log1p( c.stats?.views || 0 ) * 0.5;

            return { video: c, score };

        } );

        // Get suggested items from candidates
        const items = scored
            .sort( ( a, b ) => b.score - a.score || ( b.video.stats?.views || 0 ) - ( a.video.stats?.views || 0 ) )
            .slice( 0, n ).map( s => s.video );

        // Store suggested videos
        this.index.videos[ video.id ].suggested = { expire, items: items.map( i => i.id ) };
        await this.save();

        return items;

    }

}

export const searchIndex = new SearchIndex();
