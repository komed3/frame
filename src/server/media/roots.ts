import { realpathSync, statSync } from 'node:fs';
import { db } from '../db';


export interface MediaRoot {
  id: number;
  path: string;
}