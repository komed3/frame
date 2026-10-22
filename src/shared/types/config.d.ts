export interface ConfigSchema {
  NODE_ENV: 'dev' | 'development' | 'test' | 'prod' | 'production';

  HOST: string;
  PORT: number;

  WORKER_CONCURRENCY: number;
  WORKER_POLL_INTERVAL_MS: number;
  WORKER_RETRY_DELAY_MS: number;
  WORKER_MAX_RETRY_DELAY_MS: number;

  DB_PATH: string;
  DB_BUSY_TIMEOUT_MS: number;

  SESSION_LIFETIME_MS: number;
  PASSWORD_STRICT: boolean;

  ASSETS_PATH: string;
  ASSETS_TIMEOUT_MS: number;

  FFMPEG_TIMEOUT_MS: number;
  FFPROBE_TIMEOUT_MS: number;

  WAVE_TIMEOUT_MS: number;

  SCRUBBER_FPS: number;
  SCRUBBER_MAX_FRAMES: number;
  SCRUBBER_MIN_FRAMES: number;
}

export type ConfigName = keyof ConfigSchema;
export type ConfigValue< K extends ConfigName > = ConfigSchema[ K ];

export type ConfigDefinition< T > = {
  default: T;
  desc: string;
} & (
  T extends number ? { type: 'integer' | 'number', min: number, max: number } :
  T extends boolean ? { type: 'boolean' } :
  { type: 'string' | 'path' | 'enum', values?: readonly string[] }
);

export type ConfigTable = {
  [ K in ConfigName ]: ConfigDefinition< ConfigSchema[ K ] >
};
