import { Stream } from '@/src/server/media/Stream';
import { Router } from 'express';


export const stream = Router();


stream.get( '/:id', Stream.handle );
stream.head( '/:id', Stream.handle );
