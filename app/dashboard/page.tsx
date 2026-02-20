"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    LogOut, UploadCloud, File, FolderOpen, CheckCircle, XCircle,
    Settings, PieChart, Pause, Play, X as CancelIcon, Zap, RefreshCw,
    AlertTriangle, ArrowRight, FolderInput, FilePlus, Trash2, Clock
} from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────
const CHUNK_SIZE = 2 * 1024 * 1024;
const MIN_STREAMS = 1;
const MAX_STREAMS = 8;
const TARGET_MS_LOW = 800;
const TARGET_MS_HIGH = 3000;
const MEASURE_WINDOW = 3;
const MAX_CONCURRENT_FILES = 2;   // how many files upload simultaneously
const PERSIST_KEY = "uploader_queue_session";

// ── Types ────────────────────────────────────────────────────────────────────
type FileStatus = "queued" | "uploading" | "paused" | "done" | "error" | "cancelled";

interface QueuedFile {
    id: string;
    file: File;
    name: string;
    size: number;
    relativePath: string;   // for folder uploads, preserves directory structure
    status: FileStatus;
    progress: number;
    speed: string;
    eta: string;
    streams: number;
    error?: string;
}

// ── Leave Guard Modal ─────────────────────────────────────────────────────────
function LeaveModal({ activeCount, onPauseAndLeave, onStay, onCancelAndLeave }: {
    activeCount: number;
    onPauseAndLeave: () => void;
    onStay: () => void;
    onCancelAndLeave: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onStay} />
            <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
                <div className="h-1 w-full bg-gradient-to-r from-amber-500 via-orange-500 to-red-500" />
                <div className="p-6 space-y-5">
                    <div className="flex items-start gap-4">
                        <div className="p-2.5 bg-amber-500/10 rounded-xl border border-amber-500/20 shrink-0">
                            <AlertTriangle className="h-6 w-6 text-amber-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Upload in Progress</h2>
                            <p className="text-sm text-gray-400 mt-0.5">
                                <span className="text-gray-200 font-medium">{activeCount} file{activeCount !== 1 ? "s" : ""}</span> still uploading.
                            </p>
                        </div>
                    </div>
                    <div className="space-y-2">
                        <button onClick={onPauseAndLeave} className="w-full flex items-center justify-between px-4 py-3 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 rounded-xl text-left transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-blue-500/20 rounded-lg"><Pause className="h-4 w-4 text-blue-400" /></div>
                                <div>
                                    <div className="text-sm font-semibold text-blue-300">Pause All & Leave</div>
                                    <div className="text-xs text-gray-500">Uploads continue in background · Resume when you return</div>
                                </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-blue-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <button onClick={onStay} className="w-full flex items-center justify-between px-4 py-3 bg-gray-800 hover:bg-gray-750 border border-gray-700 rounded-xl text-left transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-gray-700 rounded-lg"><UploadCloud className="h-4 w-4 text-gray-300" /></div>
                                <div>
                                    <div className="text-sm font-semibold text-gray-200">Stay on Page</div>
                                    <div className="text-xs text-gray-500">Continue monitoring uploads</div>
                                </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                        <button onClick={onCancelAndLeave} className="w-full flex items-center justify-between px-4 py-3 bg-red-900/10 hover:bg-red-900/20 border border-red-800/30 rounded-xl text-left transition-all group">
                            <div className="flex items-center gap-3">
                                <div className="p-1.5 bg-red-900/20 rounded-lg"><XCircle className="h-4 w-4 text-red-400" /></div>
                                <div>
                                    <div className="text-sm font-semibold text-red-400">Cancel All & Leave</div>
                                    <div className="text-xs text-gray-500">Discard all pending uploads</div>
                                </div>
                            </div>
                            <ArrowRight className="h-4 w-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Format helpers ────────────────────────────────────────────────────────────
function formatBytes(bytes: number) {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024, sizes = ["B", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

function statusColor(s: FileStatus) {
    if (s === "done") return "text-green-400";
    if (s === "error" || s === "cancelled") return "text-red-400";
    if (s === "paused") return "text-amber-400";
    if (s === "uploading") return "text-blue-400";
    return "text-gray-500";
}

function statusIcon(s: FileStatus, streams: number) {
    if (s === "done") return <CheckCircle className="h-4 w-4 text-green-400 shrink-0" />;
    if (s === "error" || s === "cancelled") return <XCircle className="h-4 w-4 text-red-400 shrink-0" />;
    if (s === "paused") return <Pause className="h-4 w-4 text-amber-400 shrink-0" />;
    if (s === "queued") return <Clock className="h-4 w-4 text-gray-500 shrink-0" />;
    return <div className="h-4 w-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin shrink-0" />;
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
export default function Dashboard() {
    const [folders, setFolders] = useState<any[]>([]);
    const [selectedFolder, setSelectedFolder] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [user, setUser] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const folderInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    // Queue state
    const [queue, setQueue] = useState<QueuedFile[]>([]);
    const [showLeaveModal, setShowLeaveModal] = useState(false);

    // Refs
    const selectedFolderRef = useRef("");
    const pendingNavRef = useRef<(() => void) | null>(null);
    const cancelledRef = useRef<Set<string>>(new Set());
    const pausedRef = useRef<Set<string>>(new Set());
    const queueRef = useRef<QueuedFile[]>([]);  // mirror for use in async loops

    useEffect(() => { selectedFolderRef.current = selectedFolder; }, [selectedFolder]);
    useEffect(() => { queueRef.current = queue; }, [queue]);

    // ── Auth & folder fetch ──────────────────────────────────────────────────
    useEffect(() => {
        const token = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");
        if (!token) { router.push("/login"); return; }
        if (storedUser) setUser(JSON.parse(storedUser));
        fetch("/api/config/folders", { headers: { "Authorization": `Bearer ${token}` } })
            .then(res => { if (res.status === 401) { localStorage.removeItem("token"); router.push("/login"); } return res.json(); })
            .then(data => {
                if (data.uploadPaths) {
                    setFolders(data.uploadPaths);
                    if (data.uploadPaths.length > 0) { setSelectedFolder(data.uploadPaths[0].name); selectedFolderRef.current = data.uploadPaths[0].name; }
                }
            }).catch(() => { });
        fetchUserStatus(token);
    }, [router]);

    const fetchUserStatus = async (token: string) => {
        try {
            const res = await fetch("/api/user/status", { headers: { "Authorization": `Bearer ${token}` } });
            if (res.ok) { const d = await res.json(); setUser(d); localStorage.setItem("user", JSON.stringify(d)); }
        } catch { }
    };

    // ── beforeunload guard ───────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            const active = queueRef.current.filter(f => f.status === "uploading" || f.status === "paused" || f.status === "queued");
            if (active.length === 0) return;
            // Pause all active
            active.forEach(f => { if (f.status === "uploading") pausedRef.current.add(f.id); });
            e.preventDefault(); e.returnValue = "";
        };
        window.addEventListener("beforeunload", handler);
        return () => window.removeEventListener("beforeunload", handler);
    }, []);

    const guardedNavigate = useCallback((action: () => void) => {
        const active = queueRef.current.filter(f => f.status === "uploading" || f.status === "paused" || f.status === "queued");
        if (active.length > 0) { pendingNavRef.current = action; setShowLeaveModal(true); }
        else action();
    }, []);

    const onPauseAndLeave = () => {
        queueRef.current.forEach(f => { if (f.status === "uploading") pausedRef.current.add(f.id); });
        setShowLeaveModal(false); pendingNavRef.current?.(); pendingNavRef.current = null;
    };
    const onStay = () => { setShowLeaveModal(false); pendingNavRef.current = null; };
    const onCancelAndLeave = () => {
        queueRef.current.forEach(f => cancelledRef.current.add(f.id));
        pausedRef.current.clear();
        setShowLeaveModal(false); pendingNavRef.current?.(); pendingNavRef.current = null;
    };

    // ── File collection helpers ──────────────────────────────────────────────
    const buildQueueItems = (files: File[], pathPrefix = ""): QueuedFile[] =>
        files.map(file => ({
            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
            file,
            name: file.name,
            size: file.size,
            relativePath: (file as any).webkitRelativePath || pathPrefix + file.name,
            status: "queued" as FileStatus,
            progress: 0,
            speed: "",
            eta: "",
            streams: 2,
        }));

    const enqueue = (newItems: QueuedFile[]) => {
        setQueue(prev => {
            const updated = [...prev, ...newItems];
            return updated;
        });
        // Start processing after state settles
        setTimeout(() => processQueue(newItems), 50);
    };

    // ── Drag & Drop ──────────────────────────────────────────────────────────
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation();
        setDragActive(e.type === "dragenter" || e.type === "dragover");
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault(); e.stopPropagation(); setDragActive(false);
        const items = Array.from(e.dataTransfer.items);
        const files: File[] = [];

        // Handle folders via DataTransferItem API
        const readEntry = async (entry: FileSystemEntry, path = ""): Promise<void> => {
            if (entry.isFile) {
                await new Promise<void>(resolve => {
                    (entry as FileSystemFileEntry).file(f => {
                        // Attach relative path
                        Object.defineProperty(f, "webkitRelativePath", { value: path + f.name, writable: false });
                        files.push(f);
                        resolve();
                    });
                });
            } else if (entry.isDirectory) {
                const reader = (entry as FileSystemDirectoryEntry).createReader();
                await new Promise<void>(resolve => {
                    const readAll = () => reader.readEntries(async entries => {
                        if (entries.length === 0) { resolve(); return; }
                        for (const e of entries) await readEntry(e, path + entry.name + "/");
                        readAll();
                    });
                    readAll();
                });
            }
        };

        for (const item of items) {
            const entry = item.webkitGetAsEntry?.();
            if (entry) await readEntry(entry);
        }

        if (files.length > 0) enqueue(buildQueueItems(files));
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            enqueue(buildQueueItems(Array.from(e.target.files)));
        }
        e.target.value = "";
    };

    const handleFolderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            enqueue(buildQueueItems(Array.from(e.target.files)));
        }
        e.target.value = "";
    };

    // ── Upload a single file (chunked + adaptive) ────────────────────────────
    const uploadFile = async (item: QueuedFile) => {
        const folder = selectedFolderRef.current;
        const token = localStorage.getItem("token");
        const uploadId = item.id;
        const file = item.file;
        const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

        const updateItem = (patch: Partial<QueuedFile>) =>
            setQueue(prev => prev.map(f => f.id === item.id ? { ...f, ...patch } : f));

        updateItem({ status: "uploading" });

        const chunkProgress = new Array(totalChunks).fill(0);
        const chunkTimes: number[] = [];
        const startTime = Date.now();
        let failed: string | null = null;
        let finalDone = false;
        let nextChunk = 0;
        let completedChunks = 0;
        let currentStreams = 2;
        let activeWorkers = 0;

        const adjustStreams = () => {
            if (chunkTimes.length < MEASURE_WINDOW) return;
            const recent = chunkTimes.slice(-MEASURE_WINDOW);
            const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
            if (avg < TARGET_MS_LOW) currentStreams = Math.min(currentStreams + 1, MAX_STREAMS);
            else if (avg > TARGET_MS_HIGH) currentStreams = Math.max(Math.floor(currentStreams / 2), MIN_STREAMS);
        };

        const uploadChunk = async (idx: number) => {
            const start = idx * CHUNK_SIZE;
            const end = Math.min(start + CHUNK_SIZE, file.size);
            const form = new FormData();
            form.append("file", file.slice(start, end), file.name);
            form.append("folder", folder);
            form.append("chunkIndex", String(idx));
            form.append("totalChunks", String(totalChunks));
            form.append("uploadId", uploadId);
            form.append("filename", file.name);
            form.append("totalSize", String(file.size));

            const t0 = Date.now();
            const res = await fetch("/api/upload", { method: "POST", headers: { "Authorization": `Bearer ${token}` }, body: form });
            chunkTimes.push(Date.now() - t0);
            if (chunkTimes.length > 20) chunkTimes.shift();

            if (!res.ok) {
                let e = `HTTP ${res.status}`;
                try { const d = await res.json(); e = d.error || e; } catch { }
                throw new Error(e);
            }
            const data = await res.json();
            chunkProgress[idx] = end - start;
            completedChunks++;
            if (completedChunks % MEASURE_WINDOW === 0) adjustStreams();

            const bytes = chunkProgress.reduce((a, b) => a + b, 0);
            const elapsed = (Date.now() - startTime) / 1000;
            const speed = bytes / Math.max(elapsed, 0.1);
            const pct = (bytes / file.size) * 100;
            const eta = (file.size - bytes) / Math.max(speed, 1);

            updateItem({
                progress: pct,
                speed: (speed / 1024 / 1024).toFixed(1) + " MB/s",
                eta: eta.toFixed(0) + "s",
                streams: currentStreams,
            });

            return data.done === true;
        };

        const runWorker = async () => {
            while (nextChunk < totalChunks && !cancelledRef.current.has(uploadId) && !failed) {
                // Wait while paused
                if (pausedRef.current.has(uploadId)) {
                    updateItem({ status: "paused" });
                    await new Promise<void>(r => {
                        const poll = setInterval(() => {
                            if (!pausedRef.current.has(uploadId) || cancelledRef.current.has(uploadId)) { clearInterval(poll); r(); }
                        }, 300);
                    });
                    if (cancelledRef.current.has(uploadId)) break;
                    updateItem({ status: "uploading" });
                }
                if (activeWorkers >= currentStreams) { await new Promise(r => setTimeout(r, 80)); continue; }
                const idx = nextChunk++;
                activeWorkers++;
                try { if (await uploadChunk(idx)) finalDone = true; }
                catch (err) { failed = String(err).replace("Error: ", ""); }
                finally { activeWorkers = Math.max(0, activeWorkers - 1); }
            }
        };

        await Promise.all(Array.from({ length: Math.min(currentStreams, totalChunks) }, runWorker));

        if (cancelledRef.current.has(uploadId)) {
            updateItem({ status: "cancelled", progress: 0, speed: "", eta: "" });
        } else if (failed) {
            updateItem({ status: "error", error: failed, speed: "", eta: "" });
        } else if (finalDone) {
            updateItem({ status: "done", progress: 100, speed: "", eta: "" });
            const t = localStorage.getItem("token"); if (t) fetchUserStatus(t);
        }
    };

    // ── Queue processor — runs up to MAX_CONCURRENT_FILES at once ────────────
    const processingRef = useRef(false);

    const processQueue = useCallback(async (newItems: QueuedFile[]) => {
        // For each new item, run it when a slot is free
        for (const item of newItems) {
            // Wait until there's a free concurrent slot
            await new Promise<void>(resolve => {
                const check = () => {
                    const active = queueRef.current.filter(f => f.status === "uploading").length;
                    if (active < MAX_CONCURRENT_FILES) resolve();
                    else setTimeout(check, 200);
                };
                check();
            });
            if (!cancelledRef.current.has(item.id)) {
                uploadFile(item);
            }
        }
    }, []);

    // ── Per-file controls ────────────────────────────────────────────────────
    const pauseFile = (id: string) => {
        pausedRef.current.add(id);
        setQueue(prev => prev.map(f => f.id === id ? { ...f, status: "paused" } : f));
    };
    const resumeFile = (id: string) => {
        pausedRef.current.delete(id);
        setQueue(prev => prev.map(f => f.id === id ? { ...f, status: "uploading" } : f));
    };
    const cancelFile = (id: string) => {
        cancelledRef.current.add(id);
        pausedRef.current.delete(id);
        setQueue(prev => prev.map(f => f.id === id ? { ...f, status: "cancelled", progress: 0 } : f));
    };
    const removeFile = (id: string) => {
        cancelledRef.current.add(id);
        setQueue(prev => prev.filter(f => f.id !== id));
    };
    const clearCompleted = () => {
        setQueue(prev => prev.filter(f => f.status !== "done" && f.status !== "cancelled" && f.status !== "error"));
    };

    // ── Global controls ──────────────────────────────────────────────────────
    const pauseAll = () => {
        setQueue(prev => prev.map(f => {
            if (f.status === "uploading" || f.status === "queued") { pausedRef.current.add(f.id); return { ...f, status: "paused" }; }
            return f;
        }));
    };
    const resumeAll = () => {
        setQueue(prev => prev.map(f => {
            if (f.status === "paused") { pausedRef.current.delete(f.id); return { ...f, status: "uploading" }; }
            return f;
        }));
    };
    const cancelAll = () => {
        setQueue(prev => prev.map(f => {
            cancelledRef.current.add(f.id); pausedRef.current.delete(f.id);
            return { ...f, status: "cancelled", progress: 0 };
        }));
    };

    const handleLogout = () => guardedNavigate(() => { localStorage.removeItem("token"); document.cookie = "token=; path=/; max-age=0"; router.push("/login"); });
    const handleAdminNav = () => guardedNavigate(() => router.push("/admin"));

    // ── Derived stats ────────────────────────────────────────────────────────
    const activeFiles = queue.filter(f => f.status === "uploading" || f.status === "paused");
    const queuedFiles = queue.filter(f => f.status === "queued");
    const doneFiles = queue.filter(f => f.status === "done");
    const hasActive = activeFiles.length > 0 || queuedFiles.length > 0;
    const allPaused = activeFiles.length > 0 && activeFiles.every(f => f.status === "paused");
    const totalBytes = queue.reduce((a, f) => a + f.size, 0);
    const uploadedBytes = queue.reduce((a, f) => a + (f.size * f.progress / 100), 0);
    const overallPct = totalBytes > 0 ? (uploadedBytes / totalBytes) * 100 : 0;

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
            {showLeaveModal && (
                <LeaveModal
                    activeCount={activeFiles.length + queuedFiles.length}
                    onPauseAndLeave={onPauseAndLeave}
                    onStay={onStay}
                    onCancelAndLeave={onCancelAndLeave}
                />
            )}

            {/* Header */}
            <header className="bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center space-x-2">
                    <UploadCloud className="h-6 w-6 text-blue-500" />
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">Uploader</h1>
                </div>
                <div className="flex items-center gap-6">
                    {user && (
                        <div className="hidden md:flex items-center gap-2 text-sm text-gray-400 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700">
                            <PieChart className="h-4 w-4 text-teal-400" />
                            {user.role === 'admin' ? (
                                <span className="text-teal-400 font-medium">Unlimited Quota</span>
                            ) : (
                                <span><span className="text-gray-200">{formatBytes(parseInt(user.usage || 0))}</span><span className="mx-1 text-gray-600">/</span><span>{formatBytes(parseInt(user.quota))}</span></span>
                            )}
                        </div>
                    )}
                    <div className="flex items-center space-x-4">
                        {user?.role === 'admin' && (
                            <button onClick={handleAdminNav} title="Admin" className="text-gray-400 hover:text-white transition-colors"><Settings className="h-5 w-5" /></button>
                        )}
                        <button onClick={handleLogout} title="Logout" className="text-gray-400 hover:text-red-400 transition-colors"><LogOut className="h-5 w-5" /></button>
                    </div>
                </div>
            </header>

            <main className="flex-1 p-6 max-w-5xl mx-auto w-full space-y-6">
                {/* Mobile quota */}
                {user && user.role !== 'admin' && (
                    <div className="md:hidden text-center text-sm text-gray-400">
                        Usage: <span className="text-gray-200">{formatBytes(parseInt(user.usage || 0))}</span> / {formatBytes(parseInt(user.quota))}
                    </div>
                )}

                {/* Folder Selection */}
                <div className="space-y-3">
                    <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-2">
                        <FolderOpen className="h-4 w-4 text-teal-500" /> Destination
                    </h2>
                    <div className="flex flex-wrap gap-2">
                        {folders.map((folder) => (
                            <button
                                key={folder.name}
                                onClick={() => { setSelectedFolder(folder.name); selectedFolderRef.current = folder.name; }}
                                className={`px-4 py-2 rounded-lg border text-sm transition-all duration-200 ${selectedFolder === folder.name
                                    ? "bg-blue-600/20 border-blue-500 text-blue-100"
                                    : "bg-gray-900 border-gray-800 text-gray-400 hover:border-gray-600"
                                    }`}
                            >
                                {folder.name}
                                <span className="ml-2 text-xs opacity-50">{folder.path}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Drop Zone */}
                <div
                    className={`border-2 border-dashed rounded-2xl p-10 text-center transition-all duration-300 ${dragActive ? "border-blue-500 bg-blue-500/10 scale-[1.01]" : "border-gray-700 bg-gray-900/50 hover:bg-gray-900 hover:border-gray-600"}`}
                    onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center gap-4">
                        <div className="p-4 rounded-full bg-gray-800">
                            <UploadCloud className="h-10 w-10 text-gray-400" />
                        </div>
                        <div>
                            <p className="text-lg font-medium text-gray-200">Drop files or folders here</p>
                            <p className="text-sm text-gray-500 mt-1">or choose what to add</p>
                        </div>
                        <div className="flex gap-3 flex-wrap justify-center">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/40 text-blue-300 rounded-lg text-sm font-medium transition-colors"
                            >
                                <FilePlus className="h-4 w-4" /> Add Files
                            </button>
                            <button
                                onClick={() => folderInputRef.current?.click()}
                                className="flex items-center gap-2 px-4 py-2 bg-teal-600/20 hover:bg-teal-600/30 border border-teal-600/40 text-teal-300 rounded-lg text-sm font-medium transition-colors"
                            >
                                <FolderInput className="h-4 w-4" /> Add Folder
                            </button>
                        </div>
                        <p className="text-xs text-gray-600 flex items-center gap-1">
                            <Zap className="h-3 w-3 text-yellow-600" />
                            Adaptive parallel upload · up to {MAX_STREAMS} streams per file · {MAX_CONCURRENT_FILES} files simultaneously
                        </p>
                    </div>
                    <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
                    <input ref={folderInputRef} type="file" className="hidden" onChange={handleFolderChange}
                        {...{ webkitdirectory: "", directory: "" } as any} />
                </div>

                {/* Queue */}
                {queue.length > 0 && (
                    <div className="space-y-3">
                        {/* Queue header */}
                        <div className="flex flex-wrap items-center gap-2">
                            <div className="flex items-center gap-2 mr-auto">
                                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                                    Upload Queue
                                </h2>
                                <span className="text-xs text-gray-600">
                                    {doneFiles.length}/{queue.length} done
                                    {activeFiles.length > 0 && ` · ${activeFiles.length} active`}
                                    {queuedFiles.length > 0 && ` · ${queuedFiles.length} waiting`}
                                </span>
                            </div>
                            {hasActive && !allPaused && (
                                <button onClick={pauseAll} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-amber-600/20 hover:bg-amber-600/30 border border-amber-600/30 text-amber-400 rounded-lg transition-colors">
                                    <Pause className="h-3 w-3" /> Pause All
                                </button>
                            )}
                            {allPaused && (
                                <button onClick={resumeAll} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600/20 hover:bg-blue-600/30 border border-blue-600/30 text-blue-400 rounded-lg transition-colors">
                                    <Play className="h-3 w-3" /> Resume All
                                </button>
                            )}
                            {hasActive && (
                                <button onClick={cancelAll} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-red-600/20 hover:bg-red-600/30 border border-red-600/30 text-red-400 rounded-lg transition-colors">
                                    <CancelIcon className="h-3 w-3" /> Cancel All
                                </button>
                            )}
                            {doneFiles.length > 0 && (
                                <button onClick={clearCompleted} className="flex items-center gap-1 px-2.5 py-1 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-400 rounded-lg transition-colors">
                                    <Trash2 className="h-3 w-3" /> Clear Done
                                </button>
                            )}
                        </div>

                        {/* Overall progress bar (when multiple files) */}
                        {queue.length > 1 && hasActive && (
                            <div className="bg-gray-900 rounded-xl p-3 border border-gray-800 space-y-1.5">
                                <div className="flex justify-between text-xs text-gray-500">
                                    <span>Overall progress</span>
                                    <span>{formatBytes(uploadedBytes)} / {formatBytes(totalBytes)} · {overallPct.toFixed(1)}%</span>
                                </div>
                                <div className="w-full bg-gray-800 rounded-full h-1.5 overflow-hidden">
                                    <div className="h-1.5 rounded-full bg-gradient-to-r from-blue-600 to-teal-500 transition-all duration-300" style={{ width: `${overallPct}%` }} />
                                </div>
                            </div>
                        )}

                        {/* File list */}
                        <div className="space-y-2">
                            {queue.map(item => (
                                <div key={item.id} className={`bg-gray-900 rounded-xl border transition-all duration-200 overflow-hidden ${item.status === "done" ? "border-green-900/40" : item.status === "error" || item.status === "cancelled" ? "border-red-900/30" : item.status === "paused" ? "border-amber-900/40" : item.status === "uploading" ? "border-blue-900/40" : "border-gray-800"}`}>
                                    <div className="p-3 flex items-center gap-3">
                                        {/* Status icon */}
                                        {statusIcon(item.status, item.streams)}

                                        {/* File info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <span className="text-sm font-medium text-gray-200 truncate">{item.name}</span>
                                                <span className="text-xs text-gray-500 shrink-0">{formatBytes(item.size)}</span>
                                            </div>
                                            {item.relativePath !== item.name && (
                                                <div className="text-xs text-gray-600 truncate">{item.relativePath}</div>
                                            )}

                                            {/* Progress bar */}
                                            {(item.status === "uploading" || item.status === "paused" || item.status === "done") && item.progress > 0 && (
                                                <div className="mt-1.5 space-y-1">
                                                    <div className="w-full bg-gray-800 rounded-full h-1 overflow-hidden">
                                                        <div
                                                            className={`h-1 rounded-full transition-all duration-200 ${item.status === "paused" ? "bg-amber-500" : item.status === "done" ? "bg-green-500" : "bg-blue-500"}`}
                                                            style={{ width: `${item.progress}%` }}
                                                        />
                                                    </div>
                                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-600 font-mono">
                                                        <span className="font-medium text-gray-500">{item.progress.toFixed(1)}%</span>
                                                        {item.status === "uploading" && (
                                                            <>
                                                                <span className="text-gray-700">·</span>
                                                                <span>{item.speed}</span>
                                                                <span className="text-gray-700">·</span>
                                                                <span>ETA {item.eta}</span>
                                                                <span className="text-gray-700">·</span>
                                                                <span className="flex items-center gap-0.5 text-yellow-700">
                                                                    <Zap className="h-2.5 w-2.5 text-yellow-600" />
                                                                    {item.streams}s
                                                                </span>
                                                            </>
                                                        )}
                                                        {item.status === "paused" && <span className="text-amber-600">⏸ Paused</span>}
                                                    </div>
                                                </div>
                                            )}

                                            {/* Error message */}
                                            {item.status === "error" && item.error && (
                                                <div className="mt-1 text-xs text-red-400">{item.error}</div>
                                            )}

                                            {/* Queued label */}
                                            {item.status === "queued" && (
                                                <div className="mt-1 text-xs text-gray-600">Waiting in queue…</div>
                                            )}
                                        </div>

                                        {/* Per-file controls */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {item.status === "uploading" && (
                                                <button onClick={() => pauseFile(item.id)} className="p-1.5 text-gray-500 hover:text-amber-400 transition-colors rounded-lg hover:bg-amber-900/20" title="Pause">
                                                    <Pause className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            {item.status === "paused" && (
                                                <button onClick={() => resumeFile(item.id)} className="p-1.5 text-gray-500 hover:text-blue-400 transition-colors rounded-lg hover:bg-blue-900/20" title="Resume">
                                                    <Play className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            {(item.status === "uploading" || item.status === "paused" || item.status === "queued") && (
                                                <button onClick={() => cancelFile(item.id)} className="p-1.5 text-gray-500 hover:text-red-400 transition-colors rounded-lg hover:bg-red-900/20" title="Cancel">
                                                    <CancelIcon className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                            {(item.status === "done" || item.status === "error" || item.status === "cancelled") && (
                                                <button onClick={() => removeFile(item.id)} className="p-1.5 text-gray-500 hover:text-gray-300 transition-colors rounded-lg hover:bg-gray-800" title="Remove">
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}
