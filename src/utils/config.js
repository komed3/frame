import { join } from 'node:path';

const cwd = process.cwd();
const media = join( cwd, 'media' );

export { cwd, media };
