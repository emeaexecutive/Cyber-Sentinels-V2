import { spawn, spawnSync } from "node:child_process";
import process from "node:process";

export type BoundedCommandResult = {
  status: number | null;
  signal: NodeJS.Signals | null;
  timedOut: boolean;
  stdoutBytes: number;
  stderrBytes: number;
  error?: Error;
};

function terminateProcessTree(pid: number, signal: NodeJS.Signals = "SIGTERM") {
  if (process.platform === "win32") {
    const result = spawnSync("taskkill", ["/pid", String(pid), "/t", "/f"], {
      stdio: "ignore",
      shell: false,
      windowsHide: true,
      timeout: 10_000,
    });
    return result.status === 0;
  }
  try { process.kill(-pid, signal); return true; } catch { return false; }
}

export function runBoundedCommand(
  executable: string,
  args: string[],
  options: { cwd: string; env: NodeJS.ProcessEnv; timeoutMs: number },
): Promise<BoundedCommandResult> {
  return new Promise((resolve) => {
    let stdoutBytes = 0;
    let stderrBytes = 0;
    let timedOut = false;
    let settled = false;
    let forceTimer: ReturnType<typeof setTimeout> | undefined;
    const child = spawn(executable, args, {
      cwd: options.cwd,
      env: options.env,
      shell: false,
      windowsHide: true,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });

    child.stdout.on("data", (chunk: Buffer) => { stdoutBytes += chunk.byteLength; });
    child.stderr.on("data", (chunk: Buffer) => { stderrBytes += chunk.byteLength; });

    const timer = setTimeout(() => {
      timedOut = true;
      if (!child.pid || !terminateProcessTree(child.pid)) child.kill("SIGTERM");
      forceTimer = setTimeout(() => {
        if (child.pid) terminateProcessTree(child.pid, "SIGKILL");
        child.kill("SIGKILL");
        finish({ status: null, signal: "SIGKILL", timedOut: true, stdoutBytes, stderrBytes, error: new Error("Timed-out process did not close after termination.") });
      }, 5_000);
    }, options.timeoutMs);

    const finish = (result: BoundedCommandResult) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (forceTimer) clearTimeout(forceTimer);
      resolve(result);
    };

    child.once("error", (error) => finish({ status: null, signal: null, timedOut, stdoutBytes, stderrBytes, error }));
    child.once("close", (status, signal) => finish({ status, signal, timedOut, stdoutBytes, stderrBytes }));
  });
}
