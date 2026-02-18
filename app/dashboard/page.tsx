"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { LogOut, UploadCloud, File, FolderOpen, CheckCircle, XCircle, Settings } from "lucide-react";

export default function Dashboard() {
    const [folders, setFolders] = useState<any[]>([]);
    const [selectedFolder, setSelectedFolder] = useState("");
    const [dragActive, setDragActive] = useState(false);
    const [uploadStatus, setUploadStatus] = useState("");
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            router.push("/login");
            return;
        }

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
    }, [router]);

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
        // Array.from(files).forEach(uploadFile);
        // Single file for now to keep it simple, or loop
        if (files.length > 0) uploadFile(files[0]);
    }

    const uploadFile = async (file: File) => {
        setIsUploading(true);
        setUploadStatus(`Uploading ${file.name}...`);
        const token = localStorage.getItem("token");

        const formData = new FormData();
        formData.append("file", file);
        formData.append("folder", selectedFolder);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                headers: { "Authorization": `Bearer ${token}` },
                body: formData
            });

            if (res.ok) {
                setUploadStatus("Upload successful!");
                setTimeout(() => setUploadStatus(""), 3000);
            } else {
                const data = await res.json();
                setUploadStatus(`Error: ${data.error || "Upload failed"}`);
            }
        } catch (e) {
            setUploadStatus("Error uploading file.");
        } finally {
            setIsUploading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem("token");
        document.cookie = "token=; path=/; max-age=0";
        router.push("/login");
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 flex flex-col">
            {/* Header */}
            <header className="bg-gray-900 border-b border-gray-800 p-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center space-x-2">
                    <UploadCloud className="h-6 w-6 text-blue-500" />
                    <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-teal-400">Uploader</h1>
                </div>
                <div className="flex items-center space-x-4">
                    <button title="Settings" className="text-gray-400 hover:text-white transition-colors">
                        <Settings className="h-5 w-5" />
                    </button>
                    <button onClick={handleLogout} title="Logout" className="text-gray-400 hover:text-red-400 transition-colors">
                        <LogOut className="h-5 w-5" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 p-6 max-w-6xl mx-auto w-full space-y-8">

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
                    <div className={`p-4 rounded-lg flex items-center gap-3 ${uploadStatus.includes("successful")
                            ? "bg-green-500/10 text-green-400 border border-green-500/20"
                            : uploadStatus.includes("Error")
                                ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                        }`}>
                        {uploadStatus.includes("successful") ? <CheckCircle className="h-5 w-5" /> :
                            uploadStatus.includes("Error") ? <XCircle className="h-5 w-5" /> :
                                <div className="h-5 w-5 border-2 border-current border-t-transparent rounded-full animate-spin" />}
                        <span className="font-medium">{uploadStatus}</span>
                    </div>
                )}

            </main>
        </div>
    );
}
