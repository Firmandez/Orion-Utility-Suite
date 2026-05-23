import { spawn } from "node:child_process";
import { access, mkdir, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const rootDir = process.cwd();
const tauriArgs = process.argv.slice(2);

if (tauriArgs.length === 0) {
  throw new Error("No Tauri CLI arguments were provided.");
}

const env = { ...process.env };

if (process.platform === "win32") {
  const tempDir = path.join(rootDir, ".orion-build-temp");
  await mkdir(tempDir, { recursive: true });
  env.TEMP = tempDir;
  env.TMP = tempDir;
}

if (shouldCleanBundleOutputs(tauriArgs)) {
  await cleanupBundleOutputs(rootDir);
}

const tauriCliEntry = await resolveTauriCliEntry(rootDir);
const spawnOptions = {
  cwd: rootDir,
  env,
  stdio: "inherit",
  shell: false,
};

await new Promise((resolve, reject) => {
  const child = spawn(process.execPath, [tauriCliEntry, ...tauriArgs], spawnOptions);

  child.on("error", reject);
  child.on("exit", (code, signal) => {
    if (signal) {
      reject(new Error(`Tauri CLI exited due to signal ${signal}.`));
      return;
    }

    if ((code ?? 1) !== 0) {
      reject(new Error(`Tauri CLI exited with code ${code ?? 1}.`));
      return;
    }

    resolve(undefined);
  });
});

async function resolveTauriCliEntry(rootDirectory) {
  const cliEntryPath = path.join(rootDirectory, "node_modules", "@tauri-apps", "cli", "tauri.js");

  await access(cliEntryPath);
  return cliEntryPath;
}

function shouldCleanBundleOutputs(args) {
  return args[0] === "build" && !args.includes("--no-bundle");
}

async function cleanupBundleOutputs(rootDirectory) {
  const bundleDirectory = path.join(rootDirectory, "src-tauri", "target", "release", "bundle");
  await rm(bundleDirectory, { recursive: true, force: true });
}
