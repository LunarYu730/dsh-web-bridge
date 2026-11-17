// Remove the imported Sessions that 0.4.5-fork.5 and earlier created with the
// legacy `deepseek-web-<uuid>` id shape.
//
// The Host accepts those ids, but tooling that validates the `session-*` shape
// (e.g. @kissblank/dsh-session-manager's delete route) refuses them with
// `"…" is not a Session id`, so those rows cannot be deleted from the UI.
// 0.4.5-fork.6 and later mint `session-<uuid>` instead; this script clears what
// the old code left behind.
//
// Close DSH first (including the tray process): the script rewrites
// `<DSH_HOME>/storages/workspace.json`, which the running Host would otherwise
// write back from memory. It keeps a timestamped backup next to that file.
//
// Usage: node scripts/purge-legacy-web-sessions.mjs [--dry-run]
import { readdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { homedir } from "node:os";

const DSH_HOME = process.env.DSH_HOME || join(homedir(), ".dsh");
const DRY = process.argv.includes("--dry-run");
const sessionsRoot = join(DSH_HOME, "sessions");
const workspaceFile = join(DSH_HOME, "storages", "workspace.json");
const cacheRoot = join(DSH_HOME, "storages", "session_projcache", "sessions");
const LEGACY = "deepseek-web-";

/** Every existing Session directory whose id uses the legacy shape. */
async function findLegacyDirectories() {
  const byId = new Map();
  const projects = await readdir(sessionsRoot, { withFileTypes: true }).catch(() => []);
  for (const project of projects) {
    if (!project.isDirectory()) continue;
    const dir = join(sessionsRoot, project.name);
    for (const entry of await readdir(dir, { withFileTypes: true }).catch(() => [])) {
      if (!entry.isDirectory() || !entry.name.startsWith(LEGACY)) continue;
      const dirs = byId.get(entry.name) || [];
      dirs.push(join(dir, entry.name));
      byId.set(entry.name, dirs);
    }
  }
  return byId;
}

async function main() {
  const found = await findLegacyDirectories();
  const ids = [...found.keys()].sort();
  console.log(`legacy Sessions: ${ids.length}`);
  for (const id of ids) console.log(`  ${id}`);
  if (ids.length === 0) return;

  const workspace = JSON.parse(await readFile(workspaceFile, "utf8"));
  const wanted = new Set(ids);
  const global = workspace.global || {};
  let membershipsBefore = 0;
  for (const record of Object.values(workspace.tables?.workspaces || {})) {
    for (const id of record.sessionIds || []) if (wanted.has(id)) membershipsBefore += 1;
  }
  const archivedBefore = (global.archivedSessionIds || []).length;

  if (!DRY) {
    const stamp = new Date().toISOString().replace(/[:.]/g, "-");
    await writeFile(`${workspaceFile}.bak-${stamp}`, JSON.stringify(workspace, null, 2));
  }

  const removed = { directories: [], cacheFiles: 0, failures: [] };
  for (const dirs of found.values()) {
    for (const dir of dirs) {
      if (DRY) { removed.directories.push(dir); continue; }
      try {
        await rm(dir, { recursive: true, force: true });
        removed.directories.push(dir);
      } catch (error) {
        removed.failures.push(`${dir}: ${error.message}`);
      }
    }
  }
  for (const id of ids) {
    if (DRY) { removed.cacheFiles += 1; continue; }
    try {
      await rm(join(cacheRoot, `${id}.json`), { force: true });
      removed.cacheFiles += 1;
    } catch (error) {
      removed.failures.push(`projection cache ${id}: ${error.message}`);
    }
  }

  global.archivedSessionIds = (global.archivedSessionIds || []).filter((id) => !wanted.has(id));
  global.pinnedSessionIds = (global.pinnedSessionIds || []).filter((id) => !wanted.has(id));
  for (const record of Object.values(workspace.tables?.workspaces || {})) {
    if (Array.isArray(record.sessionIds)) record.sessionIds = record.sessionIds.filter((id) => !wanted.has(id));
  }
  if (!DRY) await writeFile(workspaceFile, JSON.stringify(workspace, null, 2));

  console.log(JSON.stringify({
    dryRun: DRY,
    sessions: ids.length,
    membershipsBefore,
    archivedBefore,
    ...removed,
  }, null, 2));
}

await main();
