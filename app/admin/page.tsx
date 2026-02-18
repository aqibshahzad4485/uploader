"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Folder, Save, Trash2, Plus, ArrowLeft, UploadCloud } from "lucide-react";

export default function AdminPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [uploads, setUploads] = useState<any[]>([]);
    const [newFolder, setNewFolder] = useState({ name: "", path: "" });
    const [newUser, setNewUser] = useState({ username: "", password: "", role: "user", quota: "10737418240" });
    const [status, setStatus] = useState("");
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }

        // Fetch initial data
        fetchData(token);
    }, [router]);

    const fetchData = async (token: string) => {
        try {
            const [resUsers, resConfig, resUploads] = await Promise.all([
                fetch("/api/admin/users", { headers: { "Authorization": `Bearer ${token}` } }),
                fetch("/api/config/folders", { headers: { "Authorization": `Bearer ${token}` } }),
                fetch("/api/admin/uploads", { headers: { "Authorization": `Bearer ${token}` } })
            ]);

            if (resUsers.status === 403) {
                router.push("/dashboard"); // Not admin
                return;
            }

            if (resUsers.ok) setUsers(await resUsers.json());
            if (resConfig.ok) {
                const data = await resConfig.json();
                setFolders(data.uploadPaths || []);
            }
            if (resUploads.ok) setUploads(await resUploads.json());
        } catch (e) {
            setStatus("Error loading data");
        }
    };

    const handleAddUser = async (e: React.FormEvent) => {
        e.preventDefault();
        const token = localStorage.getItem("token");
        const res = await fetch("/api/admin/users", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify(newUser)
        });
        if (res.ok) {
            setStatus("User created");
            fetchData(token!);
            setNewUser({ ...newUser, username: "" });
        } else {
            setStatus("Error creating user");
        }
    };

    const handleSaveConfig = async () => {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/admin/config", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ uploadPaths: folders })
        });
        if (res.ok) setStatus("Config saved");
        else setStatus("Error saving config");
    };

    const addFolder = () => {
        if (newFolder.name && newFolder.path) {
            setFolders([...folders, newFolder]);
            setNewFolder({ name: "", path: "" });
        }
    };

    const removeFolder = (index: number) => {
        const newFolders = [...folders];
        newFolders.splice(index, 1);
        setFolders(newFolders);
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                    <h1 className="text-2xl font-bold">Admin Panel</h1>
                    <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-gray-400 hover:text-white">
                        <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                    </button>
                </div>

                {status && <div className="p-3 bg-blue-900/20 text-blue-400 rounded border border-blue-900/50">{status}</div>}

                {/* Folders Config */}
                <section className="bg-gray-900 p-6 rounded-lg border border-gray-800 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold flex items-center gap-2"><Folder className="h-5 w-5" /> Folder Management</h2>
                        <button onClick={handleSaveConfig} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded text-white text-sm">
                            <Save className="h-4 w-4" /> Save Configuration
                        </button>
                    </div>

                    <div className="space-y-2">
                        {folders.map((f, i) => (
                            <div key={i} className="flex items-center gap-4 bg-gray-800 p-3 rounded">
                                <span className="font-medium w-1/4">{f.name}</span>
                                <span className="text-gray-400 flex-1 ml-2 font-mono text-sm">{f.path}</span>
                                <button onClick={() => removeFolder(i)} className="text-red-400 hover:text-red-300">
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex gap-2 items-end pt-4 border-t border-gray-800">
                        <div className="flex-1 space-y-1">
                            <label className="text-xs text-gray-500">Name</label>
                            <input className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                                value={newFolder.name} onChange={e => setNewFolder({ ...newFolder, name: e.target.value })} placeholder="Movies" />
                        </div>
                        <div className="flex-[2] space-y-1">
                            <label className="text-xs text-gray-500">Path</label>
                            <input className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                                value={newFolder.path} onChange={e => setNewFolder({ ...newFolder, path: e.target.value })} placeholder="/mnt/media/movies" />
                        </div>
                        <button onClick={addFolder} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white h-[42px]">
                            <Plus className="h-5 w-5" />
                        </button>
                    </div>
                </section>

                {/* User Management */}
                <section className="bg-gray-900 p-6 rounded-lg border border-gray-800 space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> User Management</h2>

                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-800 text-gray-400 text-sm">
                                <th className="py-2">Username</th>
                                <th className="py-2">Role</th>
                                <th className="py-2">Quota (Bytes)</th>
                                <th className="py-2">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/50">
                                    <td className="py-3">{u.username}</td>
                                    <td className="py-3"><span className={`px-2 py-0.5 rounded text-xs ${u.role === 'admin' ? 'bg-purple-900 text-purple-200' : 'bg-gray-700 text-gray-200'}`}>{u.role}</span></td>
                                    <td className="py-3 font-mono text-sm">{u.quota}</td>
                                    <td className="py-3 text-gray-500">Edit (TODO)</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    <form onSubmit={handleAddUser} className="grid grid-cols-4 gap-4 items-end pt-4 border-t border-gray-800">
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Username</label>
                            <input className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                                value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Password</label>
                            <input className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2" type="password"
                                value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} required />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-gray-500">Role</label>
                            <select className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2"
                                value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                                <option value="user">User</option>
                                <option value="admin">Admin</option>
                            </select>
                        </div>
                        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white h-[42px]">
                            Create User
                        </button>
                    </form>
                </section>

                {/* Recent Uploads */}
                <section className="bg-gray-900 p-6 rounded-lg border border-gray-800 space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2"><UploadCloud className="h-5 w-5" /> Recent Uploads</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-800 text-gray-400 text-sm">
                                    <th className="py-2">File</th>
                                    <th className="py-2">User</th>
                                    <th className="py-2">Size</th>
                                    <th className="py-2">Date</th>
                                    <th className="py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {uploads.map((u: any) => (
                                    <tr key={u.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/50">
                                        <td className="py-3 font-medium text-blue-400">{u.filename}</td>
                                        <td className="py-3 text-gray-400">{u.user?.username}</td>
                                        <td className="py-3 font-mono text-sm">{(parseInt(u.size) / 1024 / 1024).toFixed(2)} MB</td>
                                        <td className="py-3 text-gray-500 text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                                        <td className="py-3"><span className="px-2 py-0.5 rounded text-xs bg-green-900 text-green-200">{u.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>
            </div>
        </div>
    );
}
