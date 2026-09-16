import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { hashPassword } from '../src/shared/crypto/password';
import { usernameSchema } from '../src/shared/schemas/auth.schema';
import { generatePassword } from './lib/password-gen';
import { buildAdminInsertSql, buildPasswordResetSql } from './lib/admin-sql';
import { sqlValue } from './lib/sql';
import { d1ExecuteFile, d1Query } from './lib/wrangler';

const MIN_PASSWORD_LENGTH = 12;

type CliTarget = 'local' | 'remote';

interface CliArgs {
  tenant?: string;
  username?: string;
  password?: string;
  remote: boolean;
}

function resolvePassword(provided: string | undefined): string {
  if (!provided) {
    return generatePassword();
  }

  if (provided.length < MIN_PASSWORD_LENGTH) {
    console.error(`La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres.`);
    process.exit(1);
  }

  return provided;
}

function printGeneratedPassword(password: string): void {
  console.log(`Contraseña (guardala ahora, no se vuelve a mostrar): ${password}`);
}

function runSql(sql: string, target: CliTarget): void {
  const tempFile = join(tmpdir(), `admin-${crypto.randomUUID()}.sql`);
  writeFileSync(tempFile, sql, 'utf-8');
  d1ExecuteFile(tempFile, target);
}

async function createAdmin(args: CliArgs): Promise<void> {
  const target: CliTarget = args.remote ? 'remote' : 'local';

  if (!args.tenant || !args.username) {
    console.error(
      'Uso: admin create --tenant <slug> --username <usuario> [--password <clave>] [--remote]',
    );
    process.exit(1);
    return;
  }

  const usernameResult = usernameSchema.safeParse(args.username);

  if (!usernameResult.success) {
    console.error(`Usuario inválido: ${usernameResult.error.issues[0]?.message}`);
    process.exit(1);
    return;
  }

  const tenantRows = d1Query<{ id: string }>(
    `SELECT id FROM tenants WHERE slug = ${sqlValue(args.tenant)}`,
    target,
  );

  if (tenantRows.length === 0) {
    console.error(`No existe el tenant "${args.tenant}".`);
    process.exit(1);
    return;
  }

  const password = resolvePassword(args.password);
  const passwordHash = await hashPassword(password);
  const sql = buildAdminInsertSql({
    id: crypto.randomUUID(),
    tenantSlug: args.tenant,
    username: usernameResult.data,
    passwordHash,
  });

  runSql(sql, target);
  printGeneratedPassword(password);
}

async function resetPassword(args: CliArgs): Promise<void> {
  const target: CliTarget = args.remote ? 'remote' : 'local';

  if (!args.username) {
    console.error('Uso: admin reset-password --username <usuario> [--password <clave>] [--remote]');
    process.exit(1);
    return;
  }

  const password = resolvePassword(args.password);
  const passwordHash = await hashPassword(password);
  const sql = buildPasswordResetSql(args.username, passwordHash);

  runSql(sql, target);
  printGeneratedPassword(password);
}

async function main(): Promise<void> {
  const { positionals, values } = parseArgs({
    allowPositionals: true,
    options: {
      tenant: { type: 'string' },
      username: { type: 'string' },
      password: { type: 'string' },
      remote: { type: 'boolean', default: false },
    },
  });

  const [command] = positionals;

  if (command === 'create') {
    await createAdmin(values);
    return;
  }

  if (command === 'reset-password') {
    await resetPassword(values);
    return;
  }

  console.error('Uso: admin <create|reset-password> --username <usuario> ...');
  process.exit(1);
}

main();
