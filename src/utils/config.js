import { join } from 'node:path';

const cwd = process.cwd();
const media = join( cwd, 'media' );
const tmp = join( cwd, 'tmp' );

export { cwd, media, tmp };
