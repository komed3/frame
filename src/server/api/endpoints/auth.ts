import { getToken, requireAuth } from '@/src/server/api/middleware';
import { Auth } from '@/src/server/core/Auth';
import { Router } from 'express';


export const auth = Router();


auth.post( '/login', async ( req, res ) => res.json( await Auth.login( req.body?.username, req.body?.password ) ) );
auth.get( '/me', requireAuth, ( _, res ) => res.json( { user: res.locals.user } ) );
