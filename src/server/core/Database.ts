import { createHash } from 'node:crypto';
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, readdirSync, readSync, close as closeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { Config } from '@/src/server/core/Config';


export class Database {
  private connection: DatabaseSync | null = null;
  private transactionDepth = 0;

  public get isOpen () : boolean {
    return this.connection !== null;
  }
}
