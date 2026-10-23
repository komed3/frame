import { Auth } from '@/src/server/core/Auth';
import { Router } from 'express';
import { getToken, requireAuth } from '@/src/server/api/middleware';


export const auth = Router();
