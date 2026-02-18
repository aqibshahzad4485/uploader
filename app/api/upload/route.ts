import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
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
        console.error("Error reading config:", e);
        return { uploadPaths: [] };
    }
}

export async function POST(req: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File;
        const folderName = formData.get("folder") as string;

        if (!file) {
            return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
        }

        const config = getUploadConfig();
        const targetFolder = config.uploadPaths.find((p: any) => p.name === folderName);

        if (!targetFolder) {
            return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
        }

        // Resolve path. Ensure it's absolute or relative to CWD.
        let uploadDir = targetFolder.path;
        if (!path.isAbsolute(uploadDir)) {
            uploadDir = path.join(process.cwd(), uploadDir);
        }

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            await fs.promises.mkdir(uploadDir, { recursive: true });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = path.join(uploadDir, file.name);

        // Write file
        await fs.promises.writeFile(filePath, buffer);

        // Record upload in DB
        const upload = await prisma.upload.create({
            data: {
                filename: file.name,
                path: filePath,
                size: BigInt(file.size), // Prisma handles BigInt with the adapter?
                status: "completed",
                userId: user.id
            }
        });

        // Fix BigInt for response
        return NextResponse.json({
            success: true,
            file: {
                id: upload.id,
                filename: upload.filename,
                path: upload.path,
                size: upload.size.toString(),
                status: upload.status
            }
        });

    } catch (error) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
}
