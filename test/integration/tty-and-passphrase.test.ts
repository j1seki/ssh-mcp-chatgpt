import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, rm, readFile } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import { SSHConnection } from '../../src/ssh/connection.js';
import { shellSingleQuote } from '../../src/guard/sanitizer.js';
import { resolveCredentials } from '../../src/config/credential-resolver.js';
import { isSshServerUp, assertAvailable, SSH_HOST } from './helpers.js';
import { PORTS, profiles } from './fixtures.js';
import type { Profile } from '../../src/types.js';

const run = promisify(execFile);

/**
 * Two capabilities that shipped without a test behind them, both of them the
 * answer to a reported problem:
 *
 *   tty         #31, "the input device is not a TTY" — a command that needs a
 *               terminal failed with no way to ask for one.
 *   passphrase  #25, an encrypted private key could not be used at all.
 *
 * Both are configuration paths that fail at connect time on a real server, so
 * nothing short of a real server proves they work.
 */
const up = await isSshServerUp(SSH_HOST, PORTS.admin);
assertAvailable(up, `admin (${SSH_HOST}:${PORTS.admin})`);

describe.skipIf(!up)('PTY allocation', () => {
  let conn: SSHConnection;
  let savedEnv: NodeJS.ProcessEnv;

  beforeAll(async () => {
    savedEnv = { ...process.env };
    process.env.SSH_MCP_ADMIN_PASSWORD = 'secret';
    conn = new SSHConnection(profiles.admin, await resolveCredentials(profiles.admin), new Map(), 'insecure');
    await conn.ensureConnected();
  }, 30000);

  afterAll(async () => {
    await conn?.close();
    if (savedEnv) process.env = savedEnv;
  });

  it('reports no terminal without a PTY', async () => {
    const result = await conn.exec('tty');
    expect(result.stdout + result.stderr).toMatch(/not a tty/i);
  });

  it('allocates one when asked, so terminal-only commands work', async () => {
    const result = await conn.exec('tty', { tty: true });
    // A real terminal device rather than the "not a tty" complaint.
    expect(result.stdout).toMatch(/\/dev\/(pts|tty)/);
  });
});

describe.skipIf(!up)('encrypted private key', () => {
  let dir: string;
  let conn: SSHConnection | undefined;
  let provisioner: SSHConnection | undefined;
  let publicKey: string | undefined;
  let savedEnv: NodeJS.ProcessEnv;
  const PASSPHRASE = 'test-passphrase-2026';

  beforeAll(async () => {
    savedEnv = { ...process.env };
    dir = await mkdtemp(join(tmpdir(), 'ssh-mcp-passphrase-'));
    const keyPath = join(dir, 'id_ed25519');

    // An encrypted key: the whole point is that reading it is not enough.
    await run('ssh-keygen', ['-t', 'ed25519', '-N', PASSPHRASE, '-f', keyPath, '-C', 'ssh-mcp-test', '-q']);
    const pub = (await readFile(`${keyPath}.pub`, 'utf8')).trim();

    // Provision via the fixture account to keep this test independent of
    // the container runtime and the account's home directory.
    provisioner = new SSHConnection(profiles.admin, { password: 'secret' }, new Map(), 'tofu');
    const install = await provisioner.exec(
      'umask 077; mkdir -p "$HOME/.ssh" && chmod 700 "$HOME/.ssh" && ' +
      'touch "$HOME/.ssh/authorized_keys" && chmod 600 "$HOME/.ssh/authorized_keys" && ' +
      'cat >> "$HOME/.ssh/authorized_keys"',
      { stdin: `${pub}\n` },
    );
    expect(install.exitCode, 'install the fixture public key').toBe(0);
    publicKey = pub;

    process.env.SSH_MCP_ADMIN_KEY = keyPath;
    process.env.SSH_MCP_ADMIN_PASSPHRASE = PASSPHRASE;
    delete process.env.SSH_MCP_ADMIN_PASSWORD;
  }, 60000);

  afterAll(async () => {
    try {
      if (publicKey && provisioner) {
        const remove = await provisioner.exec(
          'f="$HOME/.ssh/authorized_keys"; tmp=$(mktemp "$HOME/.ssh/test-keys.XXXXXX") || exit 1; ' +
          `grep -Fvx -- ${shellSingleQuote(publicKey)} "$f" > "$tmp"; status=$?; ` +
          'if [ "$status" -le 1 ]; then mv "$tmp" "$f"; else rm "$tmp"; exit "$status"; fi',
        );
        expect(remove.exitCode, 'remove the fixture public key').toBe(0);
      }
    } finally {
      await Promise.all([conn?.close(), provisioner?.close()]);
      if (dir) await rm(dir, { recursive: true, force: true });
      if (savedEnv) process.env = savedEnv;
    }
  });

  it('authenticates with the passphrase supplied out of band', async () => {
    const profile: Profile = { ...profiles.admin, auth: 'key' };
    const creds = await resolveCredentials(profile);

    expect(creds.privateKey).toBeTruthy();
    expect(creds.passphrase).toBe(PASSPHRASE);

    conn = new SSHConnection(profile, creds, new Map(), 'insecure');
    await conn.ensureConnected();

    const result = await conn.exec('id -un');
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('admin');
  }, 30000);

  it('fails without the passphrase rather than connecting anyway', async () => {
    const profile: Profile = { ...profiles.admin, auth: 'key' };
    delete process.env.SSH_MCP_ADMIN_PASSPHRASE;
    delete process.env.SSH_MCP_PASSPHRASE;

    const creds = await resolveCredentials(profile);
    expect(creds.passphrase).toBeUndefined();

    const bare = new SSHConnection(profile, creds, new Map(), 'insecure');
    await expect(bare.ensureConnected()).rejects.toThrow();
    await bare.close().catch(() => {});

    process.env.SSH_MCP_ADMIN_PASSPHRASE = PASSPHRASE;
  }, 30000);
});
