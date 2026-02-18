"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Play, ChevronDown, ChevronRight, Lock, Unlock, Copy, Check, Terminal } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Field {
    name: string;
    type: "text" | "password" | "number" | "file" | "select";
    placeholder?: string;
    required?: boolean;
    options?: string[];
    description?: string;
}

interface Endpoint {
    id: string;
    method: "GET" | "POST" | "PUT" | "DELETE";
    path: string;
    summary: string;
    description: string;
    auth: boolean;
    adminOnly?: boolean;
    masterOnly?: boolean;
    bodyFields?: Field[];
    queryParams?: Field[];
    responseExample: string;
}

// ─── API Definitions ──────────────────────────────────────────────────────────

const ENDPOINTS: Endpoint[] = [
    {
        id: "login",
        method: "POST",
        path: "/api/auth/login",
        summary: "Login & get token",
        description: "Authenticate with username and password. Returns a JWT token valid for 7 days. Use this token as a Bearer token in the Authorization header for all protected endpoints.",
        auth: false,
        bodyFields: [
            { name: "username", type: "text", placeholder: "root", required: true },
            { name: "password", type: "password", placeholder: "admin", required: true },
        ],
        responseExample: JSON.stringify({ token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", user: { id: 1, username: "root", role: "admin", quota: "10737418240" } }, null, 2),
    },
    {
        id: "user-status",
        method: "GET",
        path: "/api/user/status",
        summary: "Get current user info",
        description: "Returns the authenticated user's profile, role, monthly quota (bytes), and current month's usage (bytes).",
        auth: true,
        responseExample: JSON.stringify({ id: 1, username: "root", role: "admin", quota: "10737418240", usage: "524288000" }, null, 2),
    },
    {
        id: "get-folders",
        method: "GET",
        path: "/api/config/folders",
        summary: "List available upload folders",
        description: "Returns the list of upload destinations available to the authenticated user. Admins see all folders; standard users see only their assigned folders.",
        auth: true,
        responseExample: JSON.stringify({ uploadPaths: [{ name: "Movies", path: "/mnt/media/movies" }, { name: "Documents", path: "/home/user/docs" }] }, null, 2),
    },
    {
        id: "upload-file",
        method: "POST",
        path: "/api/upload",
        summary: "Upload a file",
        description: "Upload a file to a specific folder. The request must be multipart/form-data. Checks are performed for: folder permission, monthly quota, and host disk usage (>80% blocks upload).",
        auth: true,
        bodyFields: [
            { name: "file", type: "file", required: true, description: "The file to upload" },
            { name: "folder", type: "text", placeholder: "Movies", required: true, description: "The folder name (must match a configured folder)" },
        ],
        responseExample: JSON.stringify({ success: true, file: { id: 42, filename: "movie.mkv", path: "/mnt/media/movies/movie.mkv", size: "1073741824", status: "completed" } }, null, 2),
    },
    {
        id: "get-users",
        method: "GET",
        path: "/api/admin/users",
        summary: "List all users",
        description: "Returns all users with their roles, quotas, allowed folders, and current month's usage. Admin only.",
        auth: true,
        adminOnly: true,
        responseExample: JSON.stringify([{ id: 1, username: "root", role: "admin", quota: "10737418240", usage: "0", allowedFolders: "[]", createdAt: "2024-01-01T00:00:00.000Z" }], null, 2),
    },
    {
        id: "create-user",
        method: "POST",
        path: "/api/admin/users",
        summary: "Create a user",
        description: "Create a new user with a specified role, quota, and allowed folders. Admin only.",
        auth: true,
        adminOnly: true,
        bodyFields: [
            { name: "username", type: "text", placeholder: "alice", required: true },
            { name: "password", type: "password", placeholder: "securepassword", required: true },
            { name: "role", type: "select", options: ["user", "admin"], required: true },
            { name: "quota", type: "number", placeholder: "10737418240", description: "Monthly quota in bytes (default: 10GB = 10737418240)" },
            { name: "allowedFolders", type: "text", placeholder: '["Movies","Documents"]', description: "JSON array of folder names" },
        ],
        responseExample: JSON.stringify({ success: true, user: { id: 2, username: "alice", role: "user" } }, null, 2),
    },
    {
        id: "update-user",
        method: "PUT",
        path: "/api/admin/users",
        summary: "Update a user",
        description: "Update a user's password, quota, or allowed folders. Cannot edit the root user unless you ARE the root user. Admin only.",
        auth: true,
        adminOnly: true,
        bodyFields: [
            { name: "id", type: "number", placeholder: "2", required: true, description: "User ID to update" },
            { name: "password", type: "password", placeholder: "newpassword", description: "Leave empty to keep current password" },
            { name: "quota", type: "number", placeholder: "10737418240", description: "New monthly quota in bytes" },
            { name: "allowedFolders", type: "text", placeholder: '["Movies"]', description: "JSON array of folder names" },
        ],
        responseExample: JSON.stringify({ success: true }, null, 2),
    },
    {
        id: "delete-user",
        method: "DELETE",
        path: "/api/admin/users?id={id}",
        summary: "Delete a user",
        description: "Delete a user and their upload history records. Files on disk are NOT deleted. Cannot delete the root user. Admin only.",
        auth: true,
        adminOnly: true,
        queryParams: [
            { name: "id", type: "number", placeholder: "2", required: true, description: "User ID to delete" },
        ],
        responseExample: JSON.stringify({ success: true }, null, 2),
    },
    {
        id: "get-uploads",
        method: "GET",
        path: "/api/admin/uploads",
        summary: "List upload history",
        description: "Returns upload history records, ordered newest first. Use the `limit` query param to restrict results.",
        auth: true,
        adminOnly: true,
        queryParams: [
            { name: "limit", type: "number", placeholder: "10", description: "Max records to return (omit for all)" },
        ],
        responseExample: JSON.stringify([{ id: 1, filename: "movie.mkv", path: "/mnt/media/movies/movie.mkv", size: "1073741824", status: "completed", ip: "192.168.1.1", userAgent: "Mozilla/5.0...", createdAt: "2024-01-01T12:00:00.000Z", user: { username: "alice", role: "user" } }], null, 2),
    },
    {
        id: "get-logins",
        method: "GET",
        path: "/api/admin/logins",
        summary: "List login history",
        description: "Returns login log records (both successes and failures), ordered newest first.",
        auth: true,
        adminOnly: true,
        queryParams: [
            { name: "limit", type: "number", placeholder: "10", description: "Max records to return (omit for all)" },
        ],
        responseExample: JSON.stringify([{ id: 1, username: "root", success: true, ip: "192.168.1.1", userAgent: "Mozilla/5.0...", createdAt: "2024-01-01T12:00:00.000Z" }], null, 2),
    },
    {
        id: "get-system-config",
        method: "GET",
        path: "/api/admin/system-config",
        summary: "Get system config",
        description: "Returns system-level configuration, currently the log retention period in days. Admin only.",
        auth: true,
        adminOnly: true,
        responseExample: JSON.stringify({ retentionDays: "30" }, null, 2),
    },
    {
        id: "set-system-config",
        method: "POST",
        path: "/api/admin/system-config",
        summary: "Update system config",
        description: "Update system-level configuration. Currently supports setting the log retention period. Master (root) only.",
        auth: true,
        masterOnly: true,
        bodyFields: [
            { name: "retentionDays", type: "number", placeholder: "30", required: true, description: "Number of days to retain login and upload logs" },
        ],
        responseExample: JSON.stringify({ success: true }, null, 2),
    },
    {
        id: "save-folder-config",
        method: "POST",
        path: "/api/admin/config",
        summary: "Save folder configuration",
        description: "Saves the upload folder configuration to uploader.json. Admin only.",
        auth: true,
        adminOnly: true,
        bodyFields: [
            { name: "uploadPaths", type: "text", placeholder: '[{"name":"Movies","path":"/mnt/media/movies"}]', required: true, description: "JSON array of folder objects with name and path" },
        ],
        responseExample: JSON.stringify({ success: true, config: { uploadPaths: [{ name: "Movies", path: "/mnt/media/movies" }] } }, null, 2),
    },
];

const METHOD_COLORS: Record<string, string> = {
    GET: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    POST: "bg-blue-500/20 text-blue-400 border-blue-500/30",
    PUT: "bg-amber-500/20 text-amber-400 border-amber-500/30",
    DELETE: "bg-red-500/20 text-red-400 border-red-500/30",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function ApiExplorerPage() {
    const router = useRouter();
    const [token, setToken] = useState("");
    const [tokenInput, setTokenInput] = useState("");
    const [openEndpoint, setOpenEndpoint] = useState<string | null>("login");
    const [fieldValues, setFieldValues] = useState<Record<string, Record<string, any>>>({});
    const [responses, setResponses] = useState<Record<string, { status: number; body: string; time: number } | null>>({});
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const [copied, setCopied] = useState(false);

    // Pre-fill token from localStorage
    useEffect(() => {
        const t = localStorage.getItem("token");
        if (t) { setToken(t); setTokenInput(t); }
    }, []);

    const setField = (endpointId: string, field: string, value: any) => {
        setFieldValues(prev => ({ ...prev, [endpointId]: { ...(prev[endpointId] || {}), [field]: value } }));
    };

    const getField = (endpointId: string, field: string) => fieldValues[endpointId]?.[field] ?? "";

    const copyToken = () => {
        navigator.clipboard.writeText(token);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const runEndpoint = async (ep: Endpoint) => {
        setLoading(prev => ({ ...prev, [ep.id]: true }));
        setResponses(prev => ({ ...prev, [ep.id]: null }));

        const fields = fieldValues[ep.id] || {};
        const headers: Record<string, string> = {};
        if (ep.auth && token) headers["Authorization"] = `Bearer ${token}`;

        const start = Date.now();
        try {
            let res: Response;
            let url = ep.path;

            if (ep.method === "GET" || ep.method === "DELETE") {
                // Append query params
                const params = new URLSearchParams();
                (ep.queryParams || []).forEach(p => {
                    if (fields[p.name]) params.set(p.name, fields[p.name]);
                });
                // Replace path params like {id}
                url = url.replace(/\{(\w+)\}/g, (_, k) => fields[k] || `:${k}`);
                if (params.toString()) url += (url.includes("?") ? "&" : "?") + params.toString();
                res = await fetch(url, { method: ep.method, headers });
            } else {
                // Check if file upload
                const hasFile = (ep.bodyFields || []).some(f => f.type === "file");
                if (hasFile) {
                    const form = new FormData();
                    (ep.bodyFields || []).forEach(f => {
                        if (f.type === "file" && fields[f.name] instanceof File) {
                            form.append(f.name, fields[f.name]);
                        } else if (fields[f.name]) {
                            form.append(f.name, fields[f.name]);
                        }
                    });
                    res = await fetch(url, { method: ep.method, headers, body: form });
                } else {
                    headers["Content-Type"] = "application/json";
                    const body: Record<string, any> = {};
                    (ep.bodyFields || []).forEach(f => {
                        if (fields[f.name] !== undefined && fields[f.name] !== "") {
                            // Try to parse JSON arrays
                            if (f.name === "allowedFolders" || f.name === "uploadPaths") {
                                try { body[f.name] = JSON.parse(fields[f.name]); } catch { body[f.name] = fields[f.name]; }
                            } else {
                                body[f.name] = fields[f.name];
                            }
                        }
                    });
                    res = await fetch(url, { method: ep.method, headers, body: JSON.stringify(body) });
                }
            }

            const elapsed = Date.now() - start;
            let bodyText = "";
            try { bodyText = JSON.stringify(await res.json(), null, 2); } catch { bodyText = await res.text(); }

            // Auto-save token if login succeeded
            if (ep.id === "login" && res.ok) {
                try {
                    const parsed = JSON.parse(bodyText);
                    if (parsed.token) { setToken(parsed.token); setTokenInput(parsed.token); }
                } catch { }
            }

            setResponses(prev => ({ ...prev, [ep.id]: { status: res.status, body: bodyText, time: elapsed } }));
        } catch (e: any) {
            setResponses(prev => ({ ...prev, [ep.id]: { status: 0, body: `Network error: ${e.message}`, time: Date.now() - start } }));
        }
        setLoading(prev => ({ ...prev, [ep.id]: false }));
    };

    const statusColor = (s: number) => {
        if (s >= 200 && s < 300) return "text-emerald-400";
        if (s >= 400) return "text-red-400";
        return "text-amber-400";
    };

    return (
        <div className="min-h-screen bg-gray-950 text-gray-100">
            {/* Header */}
            <div className="border-b border-gray-800 bg-gray-900/80 backdrop-blur sticky top-0 z-10">
                <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <button onClick={() => router.push("/admin")} className="text-gray-400 hover:text-white flex items-center gap-1 text-sm">
                            <ArrowLeft className="h-4 w-4" /> Admin
                        </button>
                        <span className="text-gray-700">/</span>
                        <div className="flex items-center gap-2">
                            <Terminal className="h-5 w-5 text-blue-400" />
                            <h1 className="text-lg font-bold">API Explorer</h1>
                        </div>
                    </div>
                    <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded font-mono">v1</span>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
                {/* Intro */}
                <div className="bg-blue-950/30 border border-blue-800/40 rounded-lg p-5">
                    <h2 className="font-semibold text-blue-300 mb-2">Getting Started</h2>
                    <p className="text-sm text-gray-400 leading-relaxed">
                        All protected endpoints require a <span className="font-mono text-blue-300">Bearer</span> token in the{" "}
                        <span className="font-mono text-blue-300">Authorization</span> header. Use the{" "}
                        <button onClick={() => setOpenEndpoint("login")} className="text-blue-400 underline underline-offset-2 hover:text-blue-300">Login</button>{" "}
                        endpoint to generate a token, then paste it below. The token will be auto-saved after a successful login.
                    </p>
                </div>

                {/* Token Bar */}
                <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 space-y-2">
                    <label className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
                        {token ? <Unlock className="h-3.5 w-3.5 text-emerald-400" /> : <Lock className="h-3.5 w-3.5 text-gray-500" />}
                        Bearer Token
                        {token && <span className="text-emerald-400 ml-1">— Active</span>}
                    </label>
                    <div className="flex gap-2">
                        <input
                            className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-xs font-mono text-gray-300 focus:outline-none focus:border-blue-500"
                            placeholder="Paste your JWT token here, or use Login below to auto-fill..."
                            value={tokenInput}
                            onChange={e => { setTokenInput(e.target.value); setToken(e.target.value); }}
                        />
                        {token && (
                            <button onClick={copyToken} className="px-3 py-2 bg-gray-700 hover:bg-gray-600 rounded text-xs flex items-center gap-1.5 text-gray-300">
                                {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                                {copied ? "Copied" : "Copy"}
                            </button>
                        )}
                    </div>
                </div>

                {/* Endpoints */}
                {ENDPOINTS.map(ep => {
                    const isOpen = openEndpoint === ep.id;
                    const resp = responses[ep.id];
                    const isLoading = loading[ep.id];

                    return (
                        <div key={ep.id} className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
                            {/* Endpoint Header */}
                            <button
                                className="w-full flex items-center gap-3 px-5 py-4 hover:bg-gray-800/50 transition-colors text-left"
                                onClick={() => setOpenEndpoint(isOpen ? null : ep.id)}
                            >
                                <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${METHOD_COLORS[ep.method]} min-w-[52px] text-center`}>
                                    {ep.method}
                                </span>
                                <span className="font-mono text-sm text-gray-300 flex-1">{ep.path}</span>
                                <div className="flex items-center gap-2 shrink-0">
                                    {ep.masterOnly && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-900/50 text-yellow-400 border border-yellow-700/40">Master</span>
                                    )}
                                    {ep.adminOnly && !ep.masterOnly && (
                                        <span className="text-xs px-1.5 py-0.5 rounded bg-purple-900/50 text-purple-400 border border-purple-700/40">Admin</span>
                                    )}
                                    {ep.auth && (
                                        <Lock className="h-3.5 w-3.5 text-gray-500" />
                                    )}
                                    <span className="text-sm text-gray-400">{ep.summary}</span>
                                    {isOpen ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                                </div>
                            </button>

                            {/* Expanded Content */}
                            {isOpen && (
                                <div className="border-t border-gray-800 px-5 py-5 space-y-5">
                                    <p className="text-sm text-gray-400 leading-relaxed">{ep.description}</p>

                                    {/* Query Params */}
                                    {ep.queryParams && ep.queryParams.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Query Parameters</h4>
                                            {ep.queryParams.map(f => (
                                                <div key={f.name} className="flex items-start gap-3">
                                                    <div className="w-36 shrink-0">
                                                        <span className="font-mono text-xs text-gray-300">{f.name}</span>
                                                        {f.required && <span className="text-red-400 ml-1">*</span>}
                                                        <div className="text-xs text-gray-600">{f.type}</div>
                                                    </div>
                                                    <div className="flex-1">
                                                        <input
                                                            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
                                                            type={f.type === "number" ? "number" : "text"}
                                                            placeholder={f.placeholder}
                                                            value={getField(ep.id, f.name)}
                                                            onChange={e => setField(ep.id, f.name, e.target.value)}
                                                        />
                                                        {f.description && <p className="text-xs text-gray-600 mt-1">{f.description}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Body Fields */}
                                    {ep.bodyFields && ep.bodyFields.length > 0 && (
                                        <div className="space-y-3">
                                            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                                {ep.bodyFields.some(f => f.type === "file") ? "Form Data" : "Request Body"}
                                            </h4>
                                            {ep.bodyFields.map(f => (
                                                <div key={f.name} className="flex items-start gap-3">
                                                    <div className="w-36 shrink-0">
                                                        <span className="font-mono text-xs text-gray-300">{f.name}</span>
                                                        {f.required && <span className="text-red-400 ml-1">*</span>}
                                                        <div className="text-xs text-gray-600">{f.type}</div>
                                                    </div>
                                                    <div className="flex-1">
                                                        {f.type === "select" ? (
                                                            <select
                                                                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500"
                                                                value={getField(ep.id, f.name)}
                                                                onChange={e => setField(ep.id, f.name, e.target.value)}
                                                            >
                                                                <option value="">Select...</option>
                                                                {f.options?.map(o => <option key={o} value={o}>{o}</option>)}
                                                            </select>
                                                        ) : f.type === "file" ? (
                                                            <input
                                                                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-400 focus:outline-none focus:border-blue-500 file:mr-3 file:py-0.5 file:px-2 file:rounded file:border-0 file:text-xs file:bg-gray-700 file:text-gray-300 file:cursor-pointer"
                                                                type="file"
                                                                onChange={e => setField(ep.id, f.name, e.target.files?.[0])}
                                                            />
                                                        ) : (
                                                            <input
                                                                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-gray-200 focus:outline-none focus:border-blue-500 font-mono"
                                                                type={f.type === "password" ? "password" : f.type === "number" ? "number" : "text"}
                                                                placeholder={f.placeholder}
                                                                value={getField(ep.id, f.name)}
                                                                onChange={e => setField(ep.id, f.name, e.target.value)}
                                                            />
                                                        )}
                                                        {f.description && <p className="text-xs text-gray-600 mt-1">{f.description}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Run Button */}
                                    <button
                                        onClick={() => runEndpoint(ep)}
                                        disabled={isLoading}
                                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded text-sm font-medium transition-colors"
                                    >
                                        <Play className="h-3.5 w-3.5" />
                                        {isLoading ? "Sending..." : "Send Request"}
                                    </button>

                                    {/* Response */}
                                    {resp && (
                                        <div className="space-y-2">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Response</h4>
                                                <span className={`text-xs font-mono font-bold ${statusColor(resp.status)}`}>
                                                    {resp.status === 0 ? "ERROR" : `${resp.status}`}
                                                </span>
                                                <span className="text-xs text-gray-600">{resp.time}ms</span>
                                            </div>
                                            <pre className="bg-gray-950 border border-gray-800 rounded p-4 text-xs font-mono text-gray-300 overflow-x-auto whitespace-pre-wrap max-h-64 overflow-y-auto">
                                                {resp.body}
                                            </pre>
                                        </div>
                                    )}

                                    {/* Example Response */}
                                    <div className="space-y-2">
                                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Example Response</h4>
                                        <pre className="bg-gray-950/50 border border-gray-800/50 rounded p-4 text-xs font-mono text-gray-600 overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto">
                                            {ep.responseExample}
                                        </pre>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Footer */}
                <div className="text-center text-xs text-gray-700 py-4">
                    All timestamps are in UTC. Sizes are in bytes. Tokens expire after 7 days.
                </div>
            </div>
        </div>
    );
}
