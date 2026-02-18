"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Filter } from "lucide-react";

export default function HistoryPage() {
    const [uploads, setUploads] = useState<any[]>([]);
    const [filteredUploads, setFilteredUploads] = useState<any[]>([]);
    const [filter, setFilter] = useState("");
    const [status, setStatus] = useState("Loading...");
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        fetchData(token);
    }, [router]);

    const fetchData = async (token: string) => {
        try {
            const res = await fetch("/api/admin/uploads", {
                headers: { "Authorization": `Bearer ${token}` }
            });
            if (res.status === 403) {
                router.push("/dashboard");
                return;
            }
            if (res.ok) {
                const data = await res.json();
                setUploads(data);
                setFilteredUploads(data);
                setStatus("");
            } else {
                setStatus("Error loading data");
            }
        } catch (e) {
            setStatus("Error loading data");
        }
    };

    useEffect(() => {
        let result = [...uploads];
        if (filter) {
            const lowerFilter = filter.toLowerCase();
            result = result.filter(u =>
                u.filename.toLowerCase().includes(lowerFilter) ||
                u.user?.username.toLowerCase().includes(lowerFilter) ||
                u.path.toLowerCase().includes(lowerFilter)
            );
        }

        if (sortConfig) {
            result.sort((a, b) => {
                let aValue = a[sortConfig.key];
                let bValue = b[sortConfig.key];

                // Handle nested, date, numeric
                if (sortConfig.key === 'user') {
                    aValue = a.user?.username || "";
                    bValue = b.user?.username || "";
                } else if (sortConfig.key === 'role') {
                    aValue = a.user?.role || "";
                    bValue = b.user?.role || "";
                } else if (sortConfig.key === 'size') {
                    aValue = parseInt(a.size);
                    bValue = parseInt(b.size);
                } else if (sortConfig.key === 'createdAt') {
                    aValue = new Date(a.createdAt).getTime();
                    bValue = new Date(b.createdAt).getTime();
                }

                if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }
        setFilteredUploads(result);
    }, [uploads, filter, sortConfig]);

    const handleSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    const SortIcon = ({ column }: { column: string }) => {
        if (sortConfig?.key !== column) return <span className="ml-1 text-gray-600">↕</span>;
        return <span className="ml-1 text-blue-400">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                    <h1 className="text-2xl font-bold">Upload History</h1>
                    <button onClick={() => router.push("/admin")} className="flex items-center gap-2 text-gray-400 hover:text-white">
                        <ArrowLeft className="h-4 w-4" /> Back to Admin
                    </button>
                </div>

                {/* Filter Bar */}
                <div className="flex gap-4 mb-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-500" />
                        <input
                            type="text"
                            placeholder="Filter by filename, user, or path..."
                            className="w-full bg-gray-900 border border-gray-800 rounded pl-10 pr-4 py-2 text-gray-200 focus:border-blue-500 focus:outline-none"
                            value={filter}
                            onChange={(e) => setFilter(e.target.value)}
                        />
                    </div>
                </div>

                <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-800/50 text-gray-400 text-sm border-b border-gray-800">
                                    <th className="py-3 px-4 cursor-pointer hover:text-white select-none" onClick={() => handleSort('filename')}>File <SortIcon column="filename" /></th>
                                    <th className="py-3 px-4 cursor-pointer hover:text-white select-none" onClick={() => handleSort('user')}>User <SortIcon column="user" /></th>
                                    <th className="py-3 px-4 cursor-pointer hover:text-white select-none" onClick={() => handleSort('role')}>Role <SortIcon column="role" /></th>
                                    <th className="py-3 px-4 cursor-pointer hover:text-white select-none" onClick={() => handleSort('size')}>Size <SortIcon column="size" /></th>
                                    <th className="py-3 px-4 cursor-pointer hover:text-white select-none" onClick={() => handleSort('path')}>Destination <SortIcon column="path" /></th>
                                    <th className="py-3 px-4 cursor-pointer hover:text-white select-none" onClick={() => handleSort('ip')}>IP <SortIcon column="ip" /></th>
                                    <th className="py-3 px-4 cursor-pointer hover:text-white select-none" onClick={() => handleSort('userAgent')}>Browser <SortIcon column="userAgent" /></th>
                                    <th className="py-3 px-4 cursor-pointer hover:text-white select-none" onClick={() => handleSort('createdAt')}>Date <SortIcon column="createdAt" /></th>
                                </tr>
                            </thead>
                            <tbody>
                                {status && <tr><td colSpan={7} className="py-8 text-center text-gray-500">{status}</td></tr>}
                                {!status && filteredUploads.length === 0 && <tr><td colSpan={7} className="py-7 text-center text-gray-500">No uploads found</td></tr>}
                                {filteredUploads.map((u: any) => (
                                    <tr key={u.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/50 transition-colors">
                                        <td className="py-3 px-4 font-medium text-blue-400 truncate max-w-[200px]" title={u.filename}>{u.filename}</td>
                                        <td className="py-3 px-4 text-gray-300">{u.user?.username}</td>
                                        <td className="py-3 px-4 text-gray-400 text-xs uppercase">{u.user?.role}</td>
                                        <td className="py-3 px-4 font-mono text-sm text-gray-400">{(parseInt(u.size) / 1024 / 1024).toFixed(2)} MB</td>
                                        <td className="py-3 px-4 text-gray-500 text-sm truncate max-w-[300px]" title={u.path}>{u.path}</td>
                                        <td className="py-3 px-4 font-mono text-sm text-gray-400">{u.ip || '-'}</td>
                                        <td className="py-3 px-4 text-gray-500 text-sm truncate max-w-[150px]" title={u.userAgent}>{u.userAgent || '-'}</td>
                                        <td className="py-3 px-4 text-gray-500 text-sm">{new Date(u.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="px-4 py-3 bg-gray-800/30 text-xs text-gray-500 border-t border-gray-800">
                        Showing {filteredUploads.length} record(s)
                    </div>
                </div>
            </div>
        </div>
    );
}
