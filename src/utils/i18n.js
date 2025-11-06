import { join } from 'node:path';
import i18next from 'i18next';
import FsBackend from 'i18next-fs-backend';
import { LanguageDetector, handle } from 'i18next-http-middleware';
import { cwd } from './config.js';

await i18next.use( FsBackend ).use( LanguageDetector ).init( {
    fallbackLng: 'en-US',
    preload: [ 'en-US', 'de-DE' ],
    cleanCode: true,
    backend: {
        loadPath: join( cwd, 'locales/{{lng}}.json' )
    },
    interpolation: {
        escapeValue: false
    },
    detection: {
        order: [ 'cookie', 'header' ],
        lookupCookie: 'locale',
        caches: [ 'cookie' ],
        cookieSameSite: 'strict'
    }
} );

export const i18nHandler = handle( i18next );
