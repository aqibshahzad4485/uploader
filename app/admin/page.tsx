"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Users, Folder, Save, Trash2, Plus, ArrowLeft, UploadCloud, Edit2, X, Check, Clock, Shield, Terminal } from "lucide-react";

export default function AdminPage() {
    const [users, setUsers] = useState<any[]>([]);
    const [folders, setFolders] = useState<any[]>([]);
    const [uploads, setUploads] = useState<any[]>([]);
    const [logins, setLogins] = useState<any[]>([]);
    const [currentUser, setCurrentUser] = useState<any>(null);

    // Config State
    const [newFolder, setNewFolder] = useState({ name: "", path: "" });
    const [newUser, setNewUser] = useState({ username: "", password: "", role: "user", quota: "10737418240", allowedFolders: [] as string[] });
    const [retentionDays, setRetentionDays] = useState("30");

    // UI State
    const [status, setStatus] = useState("");
    const [editingUser, setEditingUser] = useState<any>(null);
    const [editForm, setEditForm] = useState({ password: "", quota: "", allowedFolders: [] as string[] });
    const [deletingUser, setDeletingUser] = useState<any>(null);

    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        fetchData(token);
    }, [router]);

    const fetchData = async (token: string) => {
        try {
            const [resUsers, resConfig, resUploads, resMe, resLogins, resSysConfig] = await Promise.all([
                fetch("/api/admin/users", { headers: { "Authorization": `Bearer ${token}` } }),
                fetch("/api/config/folders", { headers: { "Authorization": `Bearer ${token}` } }),
                fetch("/api/admin/uploads?limit=10", { headers: { "Authorization": `Bearer ${token}` } }),
                fetch("/api/user/status", { headers: { "Authorization": `Bearer ${token}` } }),
                fetch("/api/admin/logins?limit=10", { headers: { "Authorization": `Bearer ${token}` } }),
                fetch("/api/admin/system-config", { headers: { "Authorization": `Bearer ${token}` } })
            ]);

            if (resUsers.status === 403) {
                setStatus("Unauthorized");
                return;
            }

            if (resUsers.ok) setUsers(await resUsers.json());
            if (resConfig.ok) {
                const data = await resConfig.json();
                setFolders(data.uploadPaths || []);
            }
            if (resUploads.ok) setUploads(await resUploads.json());
            if (resMe.ok) setCurrentUser(await resMe.json());
            if (resLogins.ok) setLogins(await resLogins.json());
            if (resSysConfig.ok) {
                const data = await resSysConfig.json();
                setRetentionDays(data.retentionDays || "30");
            }
        } catch (e) {
            setStatus("Error loading data");
        }
    };

    if (status === "Unauthorized") {
        return (
            <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <h1 className="text-3xl font-bold text-red-500">Access Denied</h1>
                    <p className="text-gray-400">You do not have permission to view this page.</p>
                    <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-blue-600 rounded text-white">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    // User Operations
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
            setNewUser({ ...newUser, username: "", allowedFolders: [] });
        } else {
            setStatus("Error creating user");
        }
    };

    const startEdit = (user: any) => {
        setEditingUser(user);
        let allowed = [];
        try { allowed = JSON.parse(user.allowedFolders || "[]"); } catch (e) { }
        setEditForm({
            password: "",
            quota: (parseInt(user.quota) / 1024 / 1024 / 1024).toFixed(2),
            allowedFolders: allowed
        });
    };

    const handleUpdateUser = async () => {
        const token = localStorage.getItem("token");
        const quotaBytes = parseFloat(editForm.quota) * 1024 * 1024 * 1024;

        const res = await fetch("/api/admin/users", {
            method: "PUT",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({
                id: editingUser.id,
                password: editForm.password,
                quota: quotaBytes.toString(),
                allowedFolders: editForm.allowedFolders
            })
        });

        if (res.ok) {
            setStatus("User updated");
            setEditingUser(null);
            fetchData(token!);
        } else {
            setStatus("Update failed");
        }
    };

    const toggleFolder = (folderName: string, isEdit: boolean) => {
        if (isEdit) {
            setEditForm(prev => {
                const current = prev.allowedFolders || [];
                if (current.includes(folderName)) {
                    return { ...prev, allowedFolders: current.filter(f => f !== folderName) };
                } else {
                    return { ...prev, allowedFolders: [...current, folderName] };
                }
            });
        } else {
            setNewUser(prev => {
                const current = prev.allowedFolders || [];
                if (current.includes(folderName)) {
                    return { ...prev, allowedFolders: current.filter(f => f !== folderName) };
                } else {
                    return { ...prev, allowedFolders: [...current, folderName] };
                }
            });
        }
    };

    const handleDeleteUser = async () => {
        if (!deletingUser) return;
        const token = localStorage.getItem("token");

        const res = await fetch(`/api/admin/users?id=${deletingUser.id}`, {
            method: "DELETE",
            headers: { "Authorization": `Bearer ${token}` }
        });

        if (res.ok) {
            setStatus("User deleted");
            setDeletingUser(null);
            fetchData(token!);
        } else {
            setStatus("Delete failed");
        }
    };

    // Config Operations
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

    const handleSaveRetention = async () => {
        const token = localStorage.getItem("token");
        const res = await fetch("/api/admin/system-config", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
            body: JSON.stringify({ retentionDays })
        });
        if (res.ok) setStatus("Retention settings saved");
        else setStatus("Error saving retention settings");
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

    // Helpers
    const formatBytes = (bytes: string) => {
        const b = parseInt(bytes);
        if (b === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(b) / Math.log(k));
        return parseFloat((b / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const isRoot = (u: any) => u.username === "root";
    const canEdit = (targetUser: any) => {
        if (!currentUser) return false;
        if (isRoot(targetUser)) return currentUser.username === "root";
        return true;
    };
    const canDelete = (targetUser: any) => !isRoot(targetUser);
    const isMaster = currentUser?.username === "root";

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-8 relative">
            <div className="max-w-6xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                    <h1 className="text-2xl font-bold">Admin Panel</h1>
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push("/admin/api")} className="flex items-center gap-2 text-gray-400 hover:text-blue-400 text-sm border border-gray-700 hover:border-blue-700 px-3 py-1.5 rounded transition-colors">
                            <Terminal className="h-4 w-4" /> API Explorer
                        </button>
                        <button onClick={() => router.push("/dashboard")} className="flex items-center gap-2 text-gray-400 hover:text-white">
                            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
                        </button>
                    </div>
                </div>

                {status && <div className="p-3 bg-blue-900/20 text-blue-400 rounded border border-blue-900/50">{status}</div>}

                {/* User Management */}
                <section className="bg-gray-900 p-6 rounded-lg border border-gray-800 space-y-4">
                    <h2 className="text-xl font-semibold flex items-center gap-2"><Users className="h-5 w-5" /> User Management</h2>

                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="border-b border-gray-800 text-gray-400 text-sm">
                                <th className="py-2 px-2">Username</th>
                                <th className="py-2 px-2">Role</th>
                                <th className="py-2 px-2">Allowed Folders</th>
                                <th className="py-2 px-2">Usage / Quota (Monthly)</th>
                                <th className="py-2 px-2 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/50">
                                    <td className="py-3 px-2 flex items-center gap-2">
                                        {u.username}
                                        {isRoot(u) && <span title="Root User" className="text-yellow-500 text-xs">👑</span>}
                                    </td>
                                    <td className="py-3 px-2">
                                        <span className={`px-2 py-0.5 rounded text-xs ${u.role === 'admin' ? (isRoot(u) ? 'bg-yellow-900 text-yellow-200' : 'bg-purple-900 text-purple-200') : 'bg-gray-700 text-gray-200'}`}>
                                            {isRoot(u) ? 'Master' : u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                                        </span>
                                    </td>
                                    <td className="py-3 px-2 text-sm text-gray-400">
                                        {u.role === 'admin' ? (
                                            <span className="text-teal-400">All</span>
                                        ) : (
                                            (() => {
                                                try {
                                                    const allowed = JSON.parse(u.allowedFolders || "[]");
                                                    return allowed.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {allowed.map((f: string) => (
                                                                <span key={f} className="px-1.5 py-0.5 bg-gray-800 rounded border border-gray-700 text-xs">{f}</span>
                                                            ))}
                                                        </div>
                                                    ) : <span className="text-gray-600 italic">None</span>;
                                                } catch (e) { return "Error"; }
                                            })()
                                        )}
                                    </td>
                                    <td className="py-3 px-2 font-mono text-sm">
                                        {formatBytes(u.usage || "0")} / {formatBytes(u.quota)}
                                    </td>
                                    <td className="py-3 px-2 text-right space-x-2">
                                        {canEdit(u) && (
                                            <button onClick={() => startEdit(u)} className="text-blue-400 hover:text-blue-300 p-1 rounded hover:bg-blue-900/20" title="Edit">
                                                <Edit2 className="h-4 w-4" />
                                            </button>
                                        )}
                                        {canDelete(u) && (
                                            <button onClick={() => setDeletingUser(u)} className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-900/20" title="Delete">
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>

                    {/* Create User Form */}
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
                        <div className="space-y-1 col-span-4">
                            <label className="text-xs text-gray-500 block mb-1">Allowed Folders (for standard users)</label>
                            <div className="flex flex-wrap gap-2">
                                {folders.map(f => (
                                    <button type="button" key={f.name}
                                        onClick={() => toggleFolder(f.name, false)}
                                        className={`px-2 py-1 rounded text-xs border ${newUser.allowedFolders.includes(f.name)
                                            ? 'bg-blue-600 border-blue-500 text-white'
                                            : 'bg-gray-800 border-gray-700 text-gray-400'}`}>
                                        {f.name}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <button type="submit" className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white h-[42px] flex items-center justify-center gap-2">
                            <Plus className="h-4 w-4" /> Create
                        </button>
                    </form>
                </section>

                {/* Folder Management */}
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

                {/* Recent Uploads */}
                <section className="bg-gray-900 p-6 rounded-lg border border-gray-800 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold flex items-center gap-2"><UploadCloud className="h-5 w-5" /> Recent Uploads</h2>
                        <button onClick={() => router.push("/admin/history")} className="text-sm text-blue-400 hover:text-blue-300">
                            View Full History
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-800 text-gray-400 text-sm">
                                    <th className="py-2">File</th>
                                    <th className="py-2">User</th>
                                    <th className="py-2">Size</th>
                                    <th className="py-2">Destination</th>
                                    <th className="py-2">Date</th>
                                    <th className="py-2">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {uploads.map((u: any) => (
                                    <tr key={u.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/50">
                                        <td className="py-3 font-medium text-blue-400 truncate max-w-[200px]" title={u.filename}>{u.filename}</td>
                                        <td className="py-3 text-gray-400">{u.user?.username}</td>
                                        <td className="py-3 font-mono text-sm">{(parseInt(u.size) / 1024 / 1024).toFixed(2)} MB</td>
                                        <td className="py-3 text-gray-500 text-sm truncate max-w-[200px]" title={u.path}>{u.path}</td>
                                        <td className="py-3 text-gray-500 text-sm">{new Date(u.createdAt).toLocaleDateString()}</td>
                                        <td className="py-3"><span className="px-2 py-0.5 rounded text-xs bg-green-900 text-green-200">{u.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>


                {/* Recent Logins */}
                <section className="bg-gray-900 p-6 rounded-lg border border-gray-800 space-y-4">
                    <div className="flex justify-between items-center">
                        <h2 className="text-xl font-semibold flex items-center gap-2"><Shield className="h-5 w-5" /> Recent Logins</h2>
                        <button onClick={() => router.push("/admin/logins")} className="text-sm text-blue-400 hover:text-blue-300">
                            View Full History
                        </button>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-gray-800 text-gray-400 text-sm">
                                    <th className="py-2">User</th>
                                    <th className="py-2">Status</th>
                                    <th className="py-2">IP Address</th>
                                    <th className="py-2">Browser / OS</th>
                                    <th className="py-2">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logins.map((l: any, i) => (
                                    <tr key={l.id || i} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/50">
                                        <td className="py-3 font-medium text-gray-200">{l.username}</td>
                                        <td className="py-3">
                                            <span className={`px-2 py-0.5 rounded text-xs ${l.success ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                                                {l.success ? 'Success' : 'Failed'}
                                            </span>
                                        </td>
                                        <td className="py-3 font-mono text-sm text-gray-400">{l.ip}</td>
                                        <td className="py-3 text-sm text-gray-500 max-w-[200px] truncate" title={l.userAgent}>{l.userAgent}</td>
                                        <td className="py-3 text-gray-500 text-sm">{new Date(l.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* Data Retention (Master Only) */}
                {isMaster && (
                    <section className="bg-gray-900 p-6 rounded-lg border border-gray-800 space-y-4 border-l-4 border-l-yellow-600">
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold flex items-center gap-2 text-yellow-500"><Clock className="h-5 w-5" /> Data Recovery & Retention</h2>
                            <button onClick={handleSaveRetention} className="flex items-center gap-2 px-4 py-2 bg-yellow-700 hover:bg-yellow-600 rounded text-white text-sm">
                                <Save className="h-4 w-4" /> Save Settings
                            </button>
                        </div>
                        <p className="text-gray-400 text-sm">
                            Configure how long login logs and upload history should be retained. Old data is automatically deleted during login operations.
                        </p>
                        <div className="max-w-xs">
                            <label className="text-xs text-gray-500 block mb-1">Retention Period (Days)</label>
                            <input
                                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white"
                                type="number"
                                min="1"
                                value={retentionDays}
                                onChange={e => setRetentionDays(e.target.value)}
                            />
                        </div>
                    </section>
                )}
            </div>

            {/* Edit User Modal */}
            {
                editingUser && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl">
                            <h3 className="text-lg font-bold flex justify-between">
                                Edit User: {editingUser.username}
                                <button onClick={() => setEditingUser(null)} className="text-gray-500 hover:text-white"><X className="h-5 w-5" /></button>
                            </h3>

                            <div className="space-y-3">
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">New Password (leave blank to keep)</label>
                                    <input className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2" type="password"
                                        value={editForm.password} onChange={e => setEditForm({ ...editForm, password: e.target.value })} placeholder="******" />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Monthly Quota (GB)</label>
                                    <input className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2" type="number" step="0.1"
                                        value={editForm.quota} onChange={e => setEditForm({ ...editForm, quota: e.target.value })} />
                                </div>
                                <div>
                                    <label className="block text-sm text-gray-400 mb-1">Allowed Folders</label>
                                    <div className="flex flex-wrap gap-2 p-2 bg-gray-800 rounded border border-gray-700">
                                        {folders.map(f => (
                                            <button type="button" key={f.name}
                                                onClick={() => toggleFolder(f.name, true)}
                                                className={`px-2 py-1 rounded text-xs border transition-colors ${editForm.allowedFolders.includes(f.name)
                                                    ? 'bg-blue-600 border-blue-500 text-white'
                                                    : 'bg-gray-900 border-gray-600 text-gray-400'}`}>
                                                {f.name}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setEditingUser(null)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                                <button onClick={handleUpdateUser} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded text-white flex items-center gap-2">
                                    <Save className="h-4 w-4" /> Save Changes
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Delete User Modal */}
            {
                deletingUser && (
                    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
                        <div className="bg-gray-900 border border-gray-800 rounded-lg p-6 max-w-md w-full space-y-4 shadow-xl">
                            <h3 className="text-lg font-bold text-red-500 flex items-center gap-2">
                                <Trash2 className="h-5 w-5" /> Confirm Delete
                            </h3>
                            <p className="text-gray-300">
                                Are you sure you want to delete user <strong>{deletingUser.username}</strong>?
                                <br /><br />
                                <span className="text-sm text-red-400">Warning: This will delete all files uploaded by this user from the database history (files on disk may remain depending on policy).</span>
                            </p>
                            <div className="flex justify-end gap-2 pt-2">
                                <button onClick={() => setDeletingUser(null)} className="px-4 py-2 text-gray-400 hover:text-white">Cancel</button>
                                <button onClick={handleDeleteUser} className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded text-white">
                                    Delete User
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
}
