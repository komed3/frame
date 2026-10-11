import { Command } from 'commander';
import { closeDatabase, db } from '@/src/server/db';
import { enqueueJob } from '@/src/server/jobs/queue';
import { mediaRoots } from '@/src/server/media/roots';


const cli = new Command();
