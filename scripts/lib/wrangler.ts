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

export function d1Query<T>(sql: string, target: 'local' | 'remote'): T[] {
  const result = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', D1_DATABASE_NAME, `--${target}`, '--command', sql, '--json'],
    { encoding: 'utf-8', shell: IS_WINDOWS },
  );

  if (result.status !== 0) {
    throw new Error(`wrangler d1 execute terminó con código ${result.status}: ${result.stderr}`);
  }

  const parsed = JSON.parse(result.stdout) as Array<{ results: T[] }>;
  return parsed[0]?.results ?? [];
}
