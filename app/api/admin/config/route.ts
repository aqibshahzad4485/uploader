import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

export async function POST(req: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { uploadPaths } = await req.json();
    // Validate structure
    if (!Array.isArray(uploadPaths)) {
        return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    const configPath = path.join(process.cwd(), "uploader.json");
    // Read existing to preserve other fields if any
    let currentConfig = {};
    if (fs.existsSync(configPath)) {
        try {
            currentConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        } catch (e) { }
    }

    const newConfig = { ...currentConfig, uploadPaths };
    fs.writeFileSync(configPath, JSON.stringify(newConfig, null, 2));

    return NextResponse.json({ success: true, config: newConfig });
}
