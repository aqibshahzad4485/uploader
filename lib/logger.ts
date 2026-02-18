/**
 * System Logger
 * Writes structured log entries to /var/log/uploader.log (or a fallback path).
 * Falls back gracefully if the log file is not writable.
 */

import fs from "fs";
import path from "path";

// Primary log path — requires the app to run with write access to /var/log/
// Falls back to <project>/logs/uploader.log if /var/log/ is not writable.
const PRIMARY_LOG = "/var/log/uploader.log";
const FALLBACK_LOG = path.join(process.cwd(), "logs", "uploader.log");

let resolvedLogPath: string | null = null;

function getLogPath(): string | null {
    if (resolvedLogPath !== null) return resolvedLogPath;

    // Try primary
    try {
        const dir = path.dirname(PRIMARY_LOG);
        fs.accessSync(dir, fs.constants.W_OK);
        // Touch the file to confirm writability
        fs.appendFileSync(PRIMARY_LOG, "");
        resolvedLogPath = PRIMARY_LOG;
        return resolvedLogPath;
    } catch {
        // Fall back to local logs/ dir
        try {
            const fallbackDir = path.dirname(FALLBACK_LOG);
            if (!fs.existsSync(fallbackDir)) {
                fs.mkdirSync(fallbackDir, { recursive: true });
            }
            resolvedLogPath = FALLBACK_LOG;
            return resolvedLogPath;
        } catch {
            resolvedLogPath = null; // logging disabled
            return null;
        }
    }
}

type LogLevel = "INFO" | "WARN" | "ERROR" | "UPLOAD" | "LOGIN" | "AUTH";

function formatEntry(level: LogLevel, message: string, meta?: Record<string, any>): string {
    const ts = new Date().toISOString();
    const metaStr = meta ? " " + JSON.stringify(meta) : "";
    return `[${ts}] [${level.padEnd(6)}] ${message}${metaStr}\n`;
}

function write(level: LogLevel, message: string, meta?: Record<string, any>) {
    const entry = formatEntry(level, message, meta);

    // Always print to stdout/stderr
    if (level === "ERROR") {
        process.stderr.write(entry);
    } else {
        process.stdout.write(entry);
    }

    // Write to file
    const logPath = getLogPath();
    if (!logPath) return;

    try {
        fs.appendFileSync(logPath, entry);
    } catch {
        // Silently ignore file write failures — stdout is the fallback
    }
}

export const logger = {
    info: (message: string, meta?: Record<string, any>) => write("INFO", message, meta),
    warn: (message: string, meta?: Record<string, any>) => write("WARN", message, meta),
    error: (message: string, meta?: Record<string, any>) => write("ERROR", message, meta),

    /** Log a login attempt */
    login: (username: string, success: boolean, ip: string, userAgent: string) =>
        write("LOGIN", `Login ${success ? "SUCCESS" : "FAILED"} for user '${username}'`, { ip, userAgent }),

    /** Log an upload event */
    upload: (username: string, filename: string, size: number, folder: string, ip: string, status: "started" | "chunk" | "complete" | "error", extra?: Record<string, any>) =>
        write("UPLOAD", `Upload ${status.toUpperCase()} by '${username}': ${filename}`, { size, folder, ip, ...extra }),

    /** Log an auth/permission event */
    auth: (message: string, meta?: Record<string, any>) => write("AUTH", message, meta),

    /** Return the resolved log file path for display */
    getLogPath,
};
