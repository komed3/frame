import { assertRootId } from '@/src/server/api/middleware';
import { JobQueue } from '@/src/server/job/Queue';
import { MediaRoots } from '@/src/server/media/Roots';
import { Router } from 'express';


export const roots = Router();
roots.param( 'id', assertRootId );


roots.get( '/', ( _, res ) => res.json( MediaRoots.list() ) );
