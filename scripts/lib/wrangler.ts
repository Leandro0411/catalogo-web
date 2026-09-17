import { spawnSync } from 'node:child_process';
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
  // --file contra --remote sube el .sql y devuelve estadísticas de ejecución,
  // no las filas; --command sí devuelve las filas del SELECT. En Windows, pasar
  // el --command como argumento de un array pierde las comillas en cmd.exe
  // (se tokeniza por espacios), así que armamos la línea completa nosotros.
  const result = IS_WINDOWS
    ? spawnSync(
        `npx wrangler d1 execute ${D1_DATABASE_NAME} --${target} --command "${sql.replace(/"/g, '\\"')}" --json`,
        { encoding: 'utf-8', shell: true },
      )
    : spawnSync(
        'npx',
        ['wrangler', 'd1', 'execute', D1_DATABASE_NAME, `--${target}`, '--command', sql, '--json'],
        { encoding: 'utf-8' },
      );

  if (result.status !== 0) {
    throw new Error(`wrangler d1 execute terminó con código ${result.status}: ${result.stderr}`);
  }

  const jsonStart = result.stdout.indexOf('[');

  if (jsonStart === -1) {
    throw new Error(`wrangler d1 execute no devolvió JSON: ${result.stdout}`);
  }

  const parsed = JSON.parse(result.stdout.slice(jsonStart)) as Array<{ results: T[] }>;
  return parsed[0]?.results ?? [];
}
