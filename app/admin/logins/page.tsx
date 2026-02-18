"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";

export default function LoginHistoryPage() {
    const [logins, setLogins] = useState<any[]>([]);
    const [status, setStatus] = useState("");
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) { router.push("/login"); return; }
        fetchData(token);
    }, [router]);

    const fetchData = async (token: string) => {
        try {
            const resLogins = await fetch("/api/admin/logins", { headers: { "Authorization": `Bearer ${token}` } }); // No limit = all

            if (resLogins.status === 403) {
                setStatus("Unauthorized");
                return;
            }

            if (resLogins.ok) setLogins(await resLogins.json());
            else setStatus("Error loading history");
        } catch (e) {
            setStatus("Error loading data");
        }
    };

    if (status === "Unauthorized") {
        return (
            <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center">
                <div className="text-center space-y-4">
                    <h1 className="text-3xl font-bold text-red-500">Access Denied</h1>
                    <button onClick={() => router.push("/dashboard")} className="px-4 py-2 bg-blue-600 rounded text-white">
                        Return to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <div className="flex items-center justify-between border-b border-gray-800 pb-4">
                    <h1 className="text-2xl font-bold flex items-center gap-2"><Shield className="h-6 w-6" /> Login History</h1>
                    <button onClick={() => router.push("/admin")} className="flex items-center gap-2 text-gray-400 hover:text-white">
                        <ArrowLeft className="h-4 w-4" /> Back to Admin Panel
                    </button>
                </div>

                {status && status !== "Unauthorized" && <div className="p-3 bg-red-900/20 text-red-400 rounded border border-red-900/50">{status}</div>}

                <div className="bg-gray-900 rounded-lg border border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="bg-gray-800/50 border-b border-gray-800 text-gray-400 text-sm">
                                    <th className="py-3 px-4">User</th>
                                    <th className="py-3 px-4">Status</th>
                                    <th className="py-3 px-4">IP Address</th>
                                    <th className="py-3 px-4">Browser / OS</th>
                                    <th className="py-3 px-4">Time</th>
                                </tr>
                            </thead>
                            <tbody>
                                {logins.map((l: any, i) => (
                                    <tr key={l.id || i} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/50">
                                        <td className="py-3 px-4 font-medium text-gray-200">{l.username}</td>
                                        <td className="py-3 px-4">
                                            <span className={`px-2 py-0.5 rounded text-xs ${l.success ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'}`}>
                                                {l.success ? 'Success' : 'Failed'}
                                            </span>
                                        </td>
                                        <td className="py-3 px-4 font-mono text-sm text-gray-400">{l.ip}</td>
                                        <td className="py-3 px-4 text-sm text-gray-500 max-w-[300px] truncate" title={l.userAgent}>{l.userAgent}</td>
                                        <td className="py-3 px-4 text-gray-500 text-sm">{new Date(l.createdAt).toLocaleString()}</td>
                                    </tr>
                                ))}
                                {logins.length === 0 && (
                                    <tr>
                                        <td colSpan={5} className="py-8 text-center text-gray-500">No login history found.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
}
