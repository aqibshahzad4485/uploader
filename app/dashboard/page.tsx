"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UploadCloud, File, FolderOpen, CheckCircle, XCircle, Settings, PieChart } from "lucide-react";

export default function Dashboard() {
    const [folders, setFolders] = useState<any[]>([]);
    const [selectedFolder, setSelectedFolder] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadStats, setUploadStats] = useState({ speed: "", uploaded: "", total: "", eta: "" });
    const [user, setUser] = useState<any>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        const storedUser = localStorage.getItem("user");
        if (!token) {
            router.push("/login");
            return;
        }
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }

        // Fetch folders
        fetch("/api/config/folders", {
            headers: { "Authorization": `Bearer ${token}` }
        })
            .then(res => {
                if (res.status === 401) {
                    localStorage.removeItem("token");
                    router.push("/login");
                }
                return res.json();
            })
            .then(data => {
                if (data.uploadPaths) {
                    setFolders(data.uploadPaths);
                    if (data.uploadPaths.length > 0) setSelectedFolder(data.uploadPaths[0].name);
                }
            })
            .catch(() => { });

        // Fetch latest user status (usage/quota)
        fetchUserStatus(token);
    }, [router]);

    const fetchUserStatus = async (token: string) => {
        try {
            const res = await fetch("/api/user/status", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setUser(data);
                localStorage.setItem("user", JSON.stringify(data));
            }
        } catch (e) { }
    };

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFiles(e.dataTransfer.files);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFiles(e.target.files);
        }
    };

    const handleFiles = (files: FileList) => {
        if (files.length > 0) uploadFile(files[0]);
    }

    const uploadFile = async (file: File) => {
        if (!folders || folders.length === 0) {
            setUploadStatus("Error: No destination exist or allowed to uplaod");
            return;
        }

        if (!selectedFolder) {
            setUploadStatus("Error: Please select a destination folder.");
            return;
        }

        if (user && user.role !== 'admin') {
            const usage = parseInt(user.usage || '0');
            const quota = parseInt(user.quota || '0');
            if (usage + file.size > quota) {
                setUploadStatus(`Error: Quota exceeded. File size (${(file.size / 1024 / 1024).toFixed(2)}MB) exceeds remaining limit.`);
                return;
            }
        }

        setIsUploading(true);
        setUploadStatus(`Starting upload for ${file.name}...`);
        setUploadProgress(0);

        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", selectedFolder);

        const xhr = new XMLHttpRequest();
        const startTime = Date.now();

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
                const percentComplete = (event.loaded / event.total) * 100;
                setUploadProgress(percentComplete);

                const timeElapsed = (Date.now() - startTime) / 1000;
                const uploadSpeed = event.loaded / timeElapsed;
                const remainingBytes = event.total - event.loaded;
                const etaSeconds = uploadSpeed > 0 ? remainingBytes / uploadSpeed : 0;

                setUploadStats({
                    speed: (uploadSpeed / 1024 / 1024).toFixed(2) + " MB/s",
                    uploaded: (event.loaded / 1024 / 1024).toFixed(2) + " MB",
                    total: (event.total / 1024 / 1024).toFixed(2) + " MB",
                    eta: etaSeconds.toFixed(0) + "s"
                });
            }
        };

        xhr.onload = async () => {
            if (xhr.status === 200) {
                setUploadStatus("Upload successful!");
                setUploadProgress(100);
                setTimeout(() => {
                    setUploadStatus("");
                    setUploadProgress(0);
                }, 3000);
                // Refresh quota
                fetchUserStatus(token!);
            } else {
                let errorMsg = "Upload failed";
                try {
                    const data = JSON.parse(xhr.responseText);
                    errorMsg = data.error || errorMsg;
                } catch (e) { }
                setUploadStatus(`Error: ${errorMsg}`);
            }
            setIsUploading(false);
        };

        xhr.onerror = () => {
            setUploadStatus("Error uploading file.");
            setIsUploading(false);
        };

        xhr.open("POST", "/api/upload");
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.send(formData);
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        document.cookie = "token=; path=/; max-age=0";
        router.push("/login");
    };

    const formatBytes = (bytes: string | number) => {
        if (!bytes) return "0 B";
        const b = typeof bytes === 'string' ? parseInt(bytes) : bytes;
        if (b === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(b) / Math.log(k));
        return parseFloat((b / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
            {/* Header */}
            <header className="bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center space-x-2">
                    <UploadCloud className="h-6 w-6 text-blue-500" />
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">Uploader</h1>
                </div>
                <div className="flex items-center gap-6">
                    {/* Usage Stats (Desktop) */}
                    {user && (
                        <div className="hidden md:flex items-center gap-2 text-sm text-gray-400 bg-gray-800 px-3 py-1.5 rounded-full border border-gray-700">
                            <PieChart className="h-4 w-4 text-teal-400" />
                            {user.role === 'admin' ? (
                                <span className="text-teal-400 font-medium">Unlimited Quota</span>
                            ) : (
                                <span>
                                    <span className="text-gray-200">{formatBytes(user.usage || 0)}</span>
                                    <span className="mx-1 text-gray-600">/</span>
                                    <span>{formatBytes(user.quota)}</span>
                                </span>
                            )}
                        </div>
                    )}

                    <div className="flex items-center space-x-4">
                        {user?.role === 'admin' && (
                            <button onClick={() => router.push('/admin')} title="Admin Settings" className="text-gray-400 hover:text-white transition-colors">
                                <Settings className="h-5 w-5" />
                            </button>
                        )}
                        <button onClick={handleLogout} title="Logout" className="text-gray-400 hover:text-red-400 transition-colors">
                            <LogOut className="h-5 w-5" />
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-8">

                {/* Mobile Usage Stats */}
                {user && user.role !== 'admin' && (
                    <div className="md:hidden text-center text-sm text-gray-400">
                        Usage: <span className="text-gray-200">{formatBytes(user.usage || 0)}</span> / {formatBytes(user.quota)}
                    </div>
                )}

                {/* Folder Selection */}
                <div className="space-y-4">
                    <h2 className="text-lg font-semibold text-gray-300 flex items-center gap-2">
                        <FolderOpen className="h-5 w-5 text-teal-500" /> Select Destination
                    </h2>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {folders.map((folder) => (
                            <button
                                key={folder.name}
                                onClick={() => setSelectedFolder(folder.name)}
                                className={`p-4 rounded-xl border transition-all duration-200 text-left ${selectedFolder === folder.name
                                    ? "bg-blue-600/20 border-blue-500 text-blue-100 shadow-lg shadow-blue-900/10"
                                    : "bg-gray-900 border-gray-800 text-gray-400 hover:bg-gray-850 hover:border-gray-700"
                                    }`}
                            >
                                <span className="block font-medium">{folder.name}</span>
                                <span className="text-xs opacity-60 truncate">{folder.path}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Upload Area */}
                <div
                    className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${dragActive
                        ? "border-blue-500 bg-blue-500/10 scale-[1.01]"
                        : "border-gray-700 bg-gray-900/50 hover:bg-gray-900"
                        }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <div className="flex flex-col items-center justify-center space-y-4">
                        <div className={`p-4 rounded-full bg-gray-800 ${isUploading ? 'animate-pulse' : ''}`}>
                            {isUploading ? <UploadCloud className="h-10 w-10 text-blue-400" /> : <File className="h-10 w-10 text-gray-400" />}
                        </div>
                        <div>
                            <p className="text-lg font-medium text-gray-200">
                                drag and drop files here
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                or <button onClick={() => fileInputRef.current?.click()} className="text-blue-400 hover:text-blue-300 font-medium font-cursor-pointer">browse files</button>
                            </p>
                        </div>
                    </div>
                    <input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        onChange={handleChange}
                    />
                </div>

                {/* Status */}
                {uploadStatus && (
                    <div className="w-full max-w-lg mx-auto bg-gray-900 rounded-lg p-4 border border-gray-800 space-y-3">
                        <div className={`flex items-center gap-3 ${uploadStatus.includes("successful")
                            ? "text-green-400"
                            : uploadStatus.includes("Error")
                                ? "text-red-400"
                                : "text-blue-400"
                            }`}>
                            {uploadStatus.includes("successful") ? <CheckCircle className="h-5 w-5" /> :
                                uploadStatus.includes("Error") ? <XCircle className="h-5 w-5" /> :
                                    <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                            <span className="font-medium">{uploadStatus}</span>
                        </div>

                        {isUploading && uploadProgress > 0 && (
                            <div className="space-y-2">
                                <div className="w-full bg-gray-800 rounded-full h-2.5 overflow-hidden">
                                    <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 font-mono">
                                    <span>{uploadStats.uploaded} / {uploadStats.total}</span>
                                    <span>{uploadStats.speed}</span>
                                    <span>ETA: {uploadStats.eta}</span>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}
