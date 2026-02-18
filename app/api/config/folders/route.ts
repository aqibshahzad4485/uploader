import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import fs from "fs";
import path from "path";

// Function to read config
function getUploadConfig() {
    try {
        const configPath = path.join(process.cwd(), "uploader.json");
        if (!fs.existsSync(configPath)) {
            return { uploadPaths: [] };
        }
        const data = fs.readFileSync(configPath, "utf-8");
        return JSON.parse(data);
    } catch (e) {
        return { uploadPaths: [] };
    }
}

export async function GET(req: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const config = getUploadConfig();
    return NextResponse.json(config);
}
