import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { D1_DATABASE_NAME } from './constants';

const IS_WINDOWS = process.platform === 'win32';

export function runWrangler(args: string[]): void {
  const result = spawnSync('npx', ['wrangler', ...args], {
    stdio: 'inherit',
    shell: IS_WINDOWS,
  });

  if (result.status !== 0) {
    throw new Error(`wrangler ${args.join(' ')} terminó con código ${result.status}`);
  }
}

export function d1ExecuteFile(file: string, target: 'local' | 'remote'): void {
  runWrangler(['d1', 'execute', D1_DATABASE_NAME, `--${target}`, '--file', file]);
}

export function kvPutFile(
  key: string,
  filePath: string,
  contentType: string,
  target: 'local' | 'remote',
): void {
  const metadataJson = JSON.stringify({ contentType });
  const metadataArg = IS_WINDOWS ? metadataJson.replace(/"/g, '\\"') : metadataJson;

  runWrangler([
    'kv',
    'key',
    'put',
    key,
    '--binding',
    'IMAGES',
    '--path',
    filePath,
    '--metadata',
    metadataArg,
    `--${target}`,
  ]);
}

export function kvDelete(key: string, target: 'local' | 'remote'): void {
  runWrangler(['kv', 'key', 'delete', key, '--binding', 'IMAGES', `--${target}`]);
}

export function d1Query<T>(sql: string, target: 'local' | 'remote'): T[] {
  const tempFile = join(tmpdir(), `d1-query-${crypto.randomUUID()}.sql`);
  writeFileSync(tempFile, sql, 'utf-8');

  const result = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', D1_DATABASE_NAME, `--${target}`, '--file', tempFile, '--json'],
    { encoding: 'utf-8', shell: IS_WINDOWS },
  );

  if (result.status !== 0) {
    throw new Error(`wrangler d1 execute terminó con código ${result.status}: ${result.stderr}`);
  }

  const parsed = JSON.parse(result.stdout) as Array<{ results: T[] }>;
  return parsed[0]?.results ?? [];
}
