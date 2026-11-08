// Every value has a d-l default. Override any of them with an env var (or a .env file).
import fs from 'fs';

if (fs.existsSync('.env')) {
  for (const line of fs.readFileSync('.env', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
  }
}

const env = (key: string, fallback: string) => process.env[key] || fallback;

export const config = {
  baseURL: env('BASE_URL', 'http://localhost:3000'),
  email: env('DL_EMAIL', 'local_dev@datachannel.co'),
  password: env('DL_PASSWORD', '123456'),

  // d-l's postgres-warehouse container, as seen from inside the docker network
  postgres: {
    host: env('PG_HOST', 'postgres-warehouse'),
    port: env('PG_PORT', '5432'),
    database: env('PG_DATABASE', 'pgs_warehouse'),
    schema: env('PG_SCHEMA', 'public'),
    username: env('PG_USER', 'root'),
    password: env('PG_PASSWORD', 'secret'),
  },
};

// Unique, sortable suffix so repeated runs never collide: 20261106_141503
export const stamp = () => new Date().toISOString().replace(/[-:]/g, '').replace('T', '_').slice(0, 15);
