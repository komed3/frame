import { JobQueue } from '@/src/server/job/Queue';
import { MediaRoots } from '@/src/server/media/Roots';
import { parseId } from '@/src/server/api/utils';
import { Router } from 'express';


export const roots = Router();


roots.get( '/', ( _, res ) => res.json( MediaRoots.list() ) );
