#!/usr/bin/env node

import { readdir, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import readline from 'node:readline';

const CWD = process.cwd();
const MEDIA_DIR = join( CWD, 'media' );
const TMP_DIR = join( CWD, 'tmp' );
const INDEX_FILE = join( MEDIA_DIR, 'index.json' );

function usage () {

    console.log( 'Usage: node scripts/cleanUp.js [--dry-run] [--yes|--force] [--verbose]' );
    console.log( '' );
    console.log( 'Options:' );
    console.log( '  --dry-run    : show what would be removed (default)' );
    console.log( '  --yes        : do not ask for confirmation, perform deletions' );
    console.log( '  --force      : alias for --yes' );
    console.log( '  --verbose    : verbose output' );
    process.exit( 1 );

}

const args = process.argv.slice( 2 );
const DRY = args.includes( '--dry-run' ) || ! args.includes( '--yes' ) && ! args.includes( '--force' );
const FORCE = args.includes( '--yes' ) || args.includes( '--force' );
const VERBOSE = args.includes( '--verbose' );

async function confirmPrompt ( question ) {

    if ( FORCE ) return true;

    return new Promise( resolve => {
        const rl = readline.createInterface( { input: process.stdin, output: process.stdout } );
        rl.question( question + ' (y/N): ', answer => {
            rl.close();
            resolve( String( answer ).toLowerCase().startsWith( 'y' ) );
        } );
    } );

}

async function loadIndex () {

    try {

        const raw = await readFile( INDEX_FILE, 'utf8' );
        const obj = JSON.parse( raw );
        return new Set( Object.keys( obj.videos || {} ) );

    } catch ( e ) {

        if ( VERBOSE ) console.error( 'Warning: could not read index file:', INDEX_FILE );
        return new Set();

    }

}

async function listMediaSubdirs () {

    try {

        const ents = await readdir( MEDIA_DIR, { withFileTypes: true } );
        return ents.filter( e => e.isDirectory() ).map( d => d.name );

    } catch ( e ) {

        if ( VERBOSE ) console.error( 'Error reading media dir:', e.message );
        return [];

    }

}

async function emptyTmp () {

    try {

        const ents = await readdir( TMP_DIR, { withFileTypes: true } ).catch( () => [] );

        if ( ents.length === 0 ) {

            console.log( 'tmp directory is empty.' );
            return [];

        }

        const paths = ents.map( e => join( TMP_DIR, e.name ) );

        if ( DRY ) {

            console.log( 'Would remove tmp entries:' );
            paths.forEach( p => console.log( '  ', p ) );
            return paths;

        }

        const removed = [];

        for ( const p of paths ) {

            await rm( p, { recursive: true, force: true } );
            removed.push( p );
            if ( VERBOSE ) console.log( 'Removed:', p );

        }

        return removed;

    } catch ( e ) {

        console.error( 'Error while cleaning tmp:', e );
        return [];

    }

}

async function removeOrphanMedia ( keepIds ) {

    const subdirs = await listMediaSubdirs();
    const orphans = subdirs.filter( d => ! keepIds.has( d ) );

    if ( orphans.length === 0 ) {

        console.log( 'No orphan media directories found.' );
        return [];

    }

    const paths = orphans.map( d => join( MEDIA_DIR, d ) );

    if ( DRY ) {

        console.log( 'Would remove orphan media directories:' );
        paths.forEach( p => console.log( '  ', p ) );
        return paths;

    }

    const removed = [];

    for ( const p of paths ) {

        try {

            await rm( p, { recursive: true, force: true } );
            removed.push( p );

            if ( VERBOSE ) console.log( 'Removed orphan:', p );

        } catch ( e ) { console.error( 'Failed to remove', p, e.message ) }

    }

    return removed;

}

async function main () {

    if ( args.includes( '--help' ) || args.includes( '-h' ) ) usage();

    console.log( `Running cleanup (dry-run=${DRY})` );

    const keepIds = await loadIndex();

    if ( VERBOSE ) console.log( 'Videos in index:', keepIds.size );

    const doConfirm = ! DRY && ! FORCE; if ( doConfirm ) {
        const ok = await confirmPrompt( 'Proceed to remove tmp entries and orphan media directories?' );
        if ( ! ok ) { console.log( 'Aborted by user.' ); return }
    }

    const removedTmp = await emptyTmp();
    const removedOrphans = await removeOrphanMedia( keepIds );

    console.log( '' );
    console.log( 'Summary:' );
    console.log( '  tmp entries removed:', removedTmp.length );
    console.log( '  orphan media dirs removed:', removedOrphans.length );

}

// run
main().catch( e => {
    console.error( 'Cleanup failed:', e );
    process.exit( 1 );
} );
