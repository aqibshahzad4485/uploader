/**
 * Upload Service Worker — Adaptive Parallel Upload
 *
 * Uses an AIMD-style (Additive Increase / Multiplicative Decrease) algorithm
 * to dynamically tune the number of parallel chunk streams based on measured
 * throughput. Streams increase when network is fast, decrease when slow/congested.
 *
 * Min streams: 1  |  Max streams: 8  |  Target chunk time: 1–3s
 */

const CHUNK_SIZE = 2 * 1024 * 1024;   // 2 MB per chunk
const MIN_STREAMS = 1;
const MAX_STREAMS = 8;
const TARGET_CHUNK_MS_LOW = 800;       // below this → increase streams
const TARGET_CHUNK_MS_HIGH = 3000;     // above this → decrease streams
const MEASURE_WINDOW = 3;              // re-evaluate every N completed chunks

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Active sessions map
const sessions = new Map();

// ── Message handler ───────────────────────────────────────────────────────────
self.addEventListener("message", async (event) => {
    const { type, payload } = event.data || {};

    if (type === "START_UPLOAD") {
        const { uploadId, file, folder, token, totalChunks, totalSize, filename } = payload;
        sessions.set(uploadId, {
            uploadId, file, folder, token, totalChunks, totalSize, filename,
            paused: false,
            cancelled: false,
            nextChunk: 0,
            activeWorkers: 0,
            currentStreams: 2,          // start conservatively
            chunkProgress: new Array(totalChunks).fill(0),
            chunkTimes: [],             // rolling window of chunk durations (ms)
            completedChunks: 0,
            startTime: Date.now(),
        });
        broadcast({ type: "UPLOAD_STARTED", uploadId });
        runUpload(uploadId);
    }

    if (type === "PAUSE_UPLOAD") {
        const s = sessions.get(payload.uploadId);
        if (s) { s.paused = true; broadcast({ type: "UPLOAD_PAUSED", uploadId: payload.uploadId }); }
    }

    if (type === "RESUME_UPLOAD") {
        const s = sessions.get(payload.uploadId);
        if (s && s.paused) {
            s.paused = false;
            broadcast({ type: "UPLOAD_RESUMED", uploadId: payload.uploadId });
            runUpload(payload.uploadId);
        }
    }

    if (type === "CANCEL_UPLOAD") {
        const s = sessions.get(payload.uploadId);
        if (s) { s.cancelled = true; s.paused = false; sessions.delete(payload.uploadId); }
        broadcast({ type: "UPLOAD_CANCELLED", uploadId: payload.uploadId });
    }

    if (type === "GET_STATUS") {
        const s = sessions.get(payload.uploadId);
        if (s) {
            const bytes = s.chunkProgress.reduce((a, b) => a + b, 0);
            broadcast({
                type: "UPLOAD_PROGRESS",
                uploadId: payload.uploadId,
                pct: (bytes / s.totalSize) * 100,
                bytesUploaded: bytes,
                totalSize: s.totalSize,
                paused: s.paused,
                streams: s.currentStreams,
            });
        }
    }
});

// ── Broadcast to all page clients ─────────────────────────────────────────────
function broadcast(msg) {
    self.clients.matchAll({ includeUncontrolled: true, type: "window" })
        .then(clients => clients.forEach(c => c.postMessage(msg)));
}

// ── Adaptive concurrency controller ──────────────────────────────────────────
function adjustStreams(session) {
    const times = session.chunkTimes;
    if (times.length < MEASURE_WINDOW) return; // not enough data yet

    // Average of the last MEASURE_WINDOW chunk durations
    const recent = times.slice(-MEASURE_WINDOW);
    const avgMs = recent.reduce((a, b) => a + b, 0) / recent.length;

    const prev = session.currentStreams;

    if (avgMs < TARGET_CHUNK_MS_LOW) {
        // Fast network — add one stream (additive increase)
        session.currentStreams = Math.min(session.currentStreams + 1, MAX_STREAMS);
    } else if (avgMs > TARGET_CHUNK_MS_HIGH) {
        // Slow / congested — halve streams (multiplicative decrease)
        session.currentStreams = Math.max(Math.floor(session.currentStreams / 2), MIN_STREAMS);
    }

    if (session.currentStreams !== prev) {
        broadcast({
            type: "STREAMS_CHANGED",
            uploadId: session.uploadId,
            streams: session.currentStreams,
            avgChunkMs: Math.round(avgMs),
        });
    }
}

// ── Upload runner ─────────────────────────────────────────────────────────────
async function runUpload(uploadId) {
    const s = sessions.get(uploadId);
    if (!s || s.paused || s.cancelled) return;

    // Upload a single chunk, returns "done" | "ok" | { error }
    const uploadChunk = async (chunkIdx) => {
        const s = sessions.get(uploadId);
        if (!s || s.cancelled) return null;

        const start = chunkIdx * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, s.totalSize);
        const chunk = s.file.slice(start, end);

        const form = new FormData();
        form.append("file", chunk, s.filename);
        form.append("folder", s.folder);
        form.append("chunkIndex", String(chunkIdx));
        form.append("totalChunks", String(s.totalChunks));
        form.append("uploadId", uploadId);
        form.append("filename", s.filename);
        form.append("totalSize", String(s.totalSize));

        const t0 = Date.now();
        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                headers: { "Authorization": `Bearer ${s.token}` },
                body: form,
            });

            const chunkMs = Date.now() - t0;
            s.chunkTimes.push(chunkMs);
            if (s.chunkTimes.length > 20) s.chunkTimes.shift(); // keep rolling window

            if (!res.ok) {
                let errMsg = `HTTP ${res.status}`;
                try { const d = await res.json(); errMsg = d.error || errMsg; } catch { }
                return { error: errMsg };
            }

            const data = await res.json();

            // Update progress
            s.chunkProgress[chunkIdx] = end - start;
            s.completedChunks++;
            const bytesUploaded = s.chunkProgress.reduce((a, b) => a + b, 0);
            const elapsed = (Date.now() - s.startTime) / 1000;
            const speed = bytesUploaded / Math.max(elapsed, 0.1);
            const remaining = s.totalSize - bytesUploaded;
            const pct = (bytesUploaded / s.totalSize) * 100;

            // Adjust concurrency every MEASURE_WINDOW chunks
            if (s.completedChunks % MEASURE_WINDOW === 0) adjustStreams(s);

            broadcast({
                type: "UPLOAD_PROGRESS",
                uploadId,
                pct,
                bytesUploaded,
                totalSize: s.totalSize,
                speed,
                eta: speed > 0 ? remaining / speed : 0,
                streams: s.currentStreams,
                avgChunkMs: s.chunkTimes.length
                    ? Math.round(s.chunkTimes.slice(-MEASURE_WINDOW).reduce((a, b) => a + b, 0) / Math.min(s.chunkTimes.length, MEASURE_WINDOW))
                    : 0,
            });

            return data.done === true ? "done" : "ok";
        } catch (err) {
            return { error: String(err) };
        }
    };

    // Sliding window parallel queue — dynamically sized
    let failed = null;
    let finalDone = false;

    // Each "worker" loops picking the next available chunk
    const runWorker = async () => {
        const s = sessions.get(uploadId);
        if (!s) return;

        while (s.nextChunk < s.totalChunks && !s.cancelled && !failed) {
            // Wait while paused
            if (s.paused) return; // will be re-spawned on resume

            // Respect current stream limit — if we already have enough active workers, yield
            if (s.activeWorkers > s.currentStreams) {
                await new Promise(r => setTimeout(r, 100));
                continue;
            }

            const myChunk = s.nextChunk++;
            s.activeWorkers++;
            const result = await uploadChunk(myChunk);
            s.activeWorkers = Math.max(0, s.activeWorkers - 1);

            if (!result || s.cancelled) return;
            if (typeof result === "object" && result.error) { failed = result.error; return; }
            if (result === "done") finalDone = true;
        }
    };

    // Spawn initial workers (up to currentStreams or totalChunks, whichever is less)
    const s2 = sessions.get(uploadId);
    if (!s2) return;
    const workerCount = Math.min(s2.currentStreams, s2.totalChunks - s2.nextChunk);
    if (workerCount <= 0) return;

    await Promise.all(Array.from({ length: workerCount }, runWorker));

    const s3 = sessions.get(uploadId);
    if (!s3 || s3.cancelled || s3.paused) return;

    if (failed) {
        sessions.delete(uploadId);
        broadcast({ type: "UPLOAD_ERROR", uploadId, error: failed });
    } else if (finalDone) {
        sessions.delete(uploadId);
        broadcast({ type: "UPLOAD_DONE", uploadId });
    }
}
