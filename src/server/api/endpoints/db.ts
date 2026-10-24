import { db } from '@/src/server/core/Database';
import { Router } from 'express';


export const database = Router();


database.get( '/stats', ( _, res ) => res.json( db.getStats() ) );
