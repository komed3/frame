import { Router } from 'express';


export const api = Router();


api.get( '/health', ( _, res ) => res.json( { status: 'ok' } ) );
