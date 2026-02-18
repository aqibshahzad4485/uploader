import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import fs from "fs";
import path from "path";
import checkDiskSpace from 'check-disk-space';

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
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let ip = (req.headers.get("x-forwarded-for") ?? "127.0.0.1").split(",")[0].trim();
    if (ip.startsWith("::ffff:")) ip = ip.substring(7);
    const userAgent = req.headers.get("user-agent") ?? "Unknown";

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

        // Check permissions and quota for non-admin users
        const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        if (user.role !== 'admin') {
            // Check folder permission
            const allowed = JSON.parse(user.allowedFolders || "[]");
            if (!allowed.includes(folderName)) {
                return NextResponse.json({ error: "Access denied to this folder" }, { status: 403 });
            }

            // Check monthly quota
            const now = new Date();
            const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const usageResult = await prisma.upload.aggregate({
                _sum: { size: true },
                where: { userId: user.id, createdAt: { gte: startOfMonth } }
            });

            const currentUsage = usageResult._sum.size || BigInt(0);
            const newSize = BigInt(file.size);

            if (currentUsage + newSize > user.quota) {
                return NextResponse.json({
                    error: `Quota exceeded. Used: ${(Number(currentUsage) / 1024 / 1024).toFixed(2)}MB / ${(Number(user.quota) / 1024 / 1024).toFixed(2)}MB`
                }, { status: 403 });
            }
        }

        // Resolve path
        let uploadDir = targetFolder.path;
        if (!path.isAbsolute(uploadDir)) {
            uploadDir = path.join(process.cwd(), uploadDir);
        }

        // Ensure directory exists
        if (!fs.existsSync(uploadDir)) {
            await fs.promises.mkdir(uploadDir, { recursive: true });
        }

        // Check Host Storage
        try {
            const diskSpace = await checkDiskSpace(uploadDir);
            const used = diskSpace.size - diskSpace.free;
            const usagePercent = (used / diskSpace.size) * 100;

            if (usagePercent > 80) {
                return NextResponse.json({ error: "Cannot upload: Host storage full (>80% usage)." }, { status: 507 });
            }
        } catch (err) {
            console.error("Disk check skipped:", err);
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
                size: BigInt(file.size),
                status: "completed",
                userId: user.id,
                ip,
                userAgent
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
