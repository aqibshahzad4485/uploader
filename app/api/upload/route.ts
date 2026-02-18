import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { logger } from "@/lib/logger";
import fs from "fs";
import path from "path";
import checkDiskSpace from 'check-disk-space';

// ── Increase body size limit for this route (chunks up to 10 MB) ─────────────
export const config = {
    api: {
        bodyParser: {
            sizeLimit: "10mb",
        },
        responseLimit: false,
    },
};

// ── Config reader ─────────────────────────────────────────────────────────────
function getUploadConfig() {
    try {
        const configPath = path.join(process.cwd(), "uploader.json");
        if (!fs.existsSync(configPath)) return { uploadPaths: [] };
        return JSON.parse(fs.readFileSync(configPath, "utf-8"));
    } catch (e) {
        logger.error("Failed to read uploader.json", { error: String(e) });
        return { uploadPaths: [] };
    }
}

// ── POST handler ──────────────────────────────────────────────────────────────
export async function POST(req: Request) {
    const sessionUser = await getCurrentUser();
    if (!sessionUser) {
        logger.auth("Unauthorized upload attempt");
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let ip = (req.headers.get("x-forwarded-for") ?? "127.0.0.1").split(",")[0].trim();
    if (ip.startsWith("::ffff:")) ip = ip.substring(7);
    const userAgent = req.headers.get("user-agent") ?? "Unknown";

    try {
        const formData = await req.formData();
        const file = formData.get("file") as File | null;
        const folderName = formData.get("folder") as string | null;

        // Chunked upload metadata
        const chunkIndexRaw = formData.get("chunkIndex");
        const totalChunksRaw = formData.get("totalChunks");
        const uploadId = formData.get("uploadId") as string | null;
        const originalFilename = formData.get("filename") as string | null;
        const totalSizeRaw = formData.get("totalSize");

        const isChunked = chunkIndexRaw !== null && totalChunksRaw !== null && uploadId && originalFilename;
        const chunkIdx = isChunked ? parseInt(chunkIndexRaw as string) : 0;
        const totalChunks = isChunked ? parseInt(totalChunksRaw as string) : 1;
        const totalSize = totalSizeRaw ? parseInt(totalSizeRaw as string) : (file?.size ?? 0);

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }
        if (!folderName) {
            return NextResponse.json({ error: "No folder specified" }, { status: 400 });
        }

        const config = getUploadConfig();
        const targetFolder = config.uploadPaths.find((p: any) => p.name === folderName);
        if (!targetFolder) {
            logger.auth(`Invalid folder '${folderName}' by '${sessionUser.username}'`, { ip });
            return NextResponse.json({ error: "Invalid folder" }, { status: 400 });
        }

        // ── Fetch DB user ────────────────────────────────────────────────────
        const user = await prisma.user.findUnique({ where: { id: sessionUser.id } });
        if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

        // ── Permission & quota checks (first chunk only) ─────────────────────
        if (chunkIdx === 0) {
            if (user.role !== 'admin') {
                const allowed = JSON.parse(user.allowedFolders || "[]");
                if (!allowed.includes(folderName)) {
                    logger.auth(`Access denied to folder '${folderName}' for '${user.username}'`, { ip });
                    return NextResponse.json({ error: "Access denied to this folder" }, { status: 403 });
                }

                const now = new Date();
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const usageResult = await prisma.upload.aggregate({
                    _sum: { size: true },
                    where: { userId: user.id, createdAt: { gte: startOfMonth } }
                });
                const currentUsage = usageResult._sum.size || BigInt(0);

                if (currentUsage + BigInt(totalSize) > user.quota) {
                    logger.warn(`Quota exceeded for '${user.username}'`, { used: currentUsage.toString(), quota: user.quota.toString(), ip });
                    return NextResponse.json({
                        error: `Quota exceeded. Used: ${(Number(currentUsage) / 1024 / 1024).toFixed(2)}MB / ${(Number(user.quota) / 1024 / 1024).toFixed(2)}MB`
                    }, { status: 403 });
                }
            }

            // ── Resolve & create upload directory ────────────────────────────
            let uploadDir = targetFolder.path;
            if (!path.isAbsolute(uploadDir)) uploadDir = path.join(process.cwd(), uploadDir);
            if (!fs.existsSync(uploadDir)) {
                await fs.promises.mkdir(uploadDir, { recursive: true });
            }

            // ── Disk space check ─────────────────────────────────────────────
            try {
                const diskSpace = await checkDiskSpace(uploadDir);
                const usedPct = ((diskSpace.size - diskSpace.free) / diskSpace.size) * 100;
                logger.info(`Disk usage on '${uploadDir}': ${usedPct.toFixed(1)}%`, { free: diskSpace.free, total: diskSpace.size });
                if (usedPct > 80) {
                    logger.warn(`Host storage full (${usedPct.toFixed(1)}%) — upload blocked`, { user: user.username, ip });
                    return NextResponse.json({ error: "Cannot upload: Host storage full (>80% usage)." }, { status: 507 });
                }
            } catch (err) {
                logger.warn("Disk space check failed — proceeding anyway", { error: String(err) });
            }

            logger.upload(user.username, isChunked ? (originalFilename as string) : file.name, totalSize, folderName, ip, "started", { chunks: totalChunks });
        }

        // ── Resolve upload directory (needed for all chunks) ─────────────────
        let uploadDir = targetFolder.path;
        if (!path.isAbsolute(uploadDir)) uploadDir = path.join(process.cwd(), uploadDir);
        if (!fs.existsSync(uploadDir)) {
            await fs.promises.mkdir(uploadDir, { recursive: true });
        }

        // ════════════════════════════════════════════════════════════════════
        // CHUNKED UPLOAD
        // ════════════════════════════════════════════════════════════════════
        if (isChunked) {
            const tempDir = path.join(process.cwd(), ".tmp_uploads", uploadId as string);
            if (!fs.existsSync(tempDir)) {
                await fs.promises.mkdir(tempDir, { recursive: true });
            }

            // Write this chunk to disk
            const chunkPath = path.join(tempDir, `chunk_${chunkIdx}`);
            const buffer = Buffer.from(await file.arrayBuffer());
            await fs.promises.writeFile(chunkPath, buffer);

            logger.upload(user.username, originalFilename as string, buffer.length, folderName, ip, "chunk", {
                chunkIdx, totalChunks, uploadId
            });

            // ── Last chunk — assemble file ───────────────────────────────────
            if (chunkIdx === totalChunks - 1) {
                const finalPath = path.join(uploadDir, originalFilename as string);

                try {
                    const writeStream = fs.createWriteStream(finalPath);

                    for (let i = 0; i < totalChunks; i++) {
                        const cp = path.join(tempDir, `chunk_${i}`);
                        if (!fs.existsSync(cp)) {
                            throw new Error(`Missing chunk ${i} — upload incomplete or corrupted`);
                        }
                        const chunkData = await fs.promises.readFile(cp);
                        await new Promise<void>((resolve, reject) => {
                            writeStream.write(chunkData, (err) => err ? reject(err) : resolve());
                        });
                    }

                    await new Promise<void>((resolve, reject) => {
                        writeStream.end((err?: Error | null) => err ? reject(err) : resolve());
                    });
                } catch (assembleErr) {
                    logger.error(`Failed to assemble chunks for '${originalFilename}'`, {
                        user: user.username, uploadId, error: String(assembleErr)
                    });
                    // Clean up partial file
                    if (fs.existsSync(finalPath)) await fs.promises.unlink(finalPath).catch(() => { });
                    return NextResponse.json({ error: "Failed to assemble file. Upload may be incomplete." }, { status: 500 });
                }

                // Clean up temp chunks
                await fs.promises.rm(tempDir, { recursive: true, force: true }).catch(() => { });

                // Record in DB
                const upload = await prisma.upload.create({
                    data: {
                        filename: originalFilename as string,
                        path: finalPath,
                        size: BigInt(totalSize),
                        status: "completed",
                        userId: user.id,
                        ip,
                        userAgent
                    }
                });

                logger.upload(user.username, originalFilename as string, totalSize, folderName, ip, "complete", {
                    fileId: upload.id, path: finalPath
                });

                return NextResponse.json({
                    success: true,
                    done: true,
                    file: {
                        id: upload.id,
                        filename: upload.filename,
                        path: upload.path,
                        size: upload.size.toString(),
                        status: upload.status
                    }
                });
            }

            // Not the last chunk — acknowledge
            return NextResponse.json({ success: true, done: false, chunkIndex: chunkIdx });
        }

        // ════════════════════════════════════════════════════════════════════
        // STANDARD (non-chunked) UPLOAD
        // ════════════════════════════════════════════════════════════════════
        const buffer = Buffer.from(await file.arrayBuffer());
        const filePath = path.join(uploadDir, file.name);
        await fs.promises.writeFile(filePath, buffer);

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

        logger.upload(user.username, file.name, file.size, folderName, ip, "complete", {
            fileId: upload.id, path: filePath
        });

        return NextResponse.json({
            success: true,
            done: true,
            file: {
                id: upload.id,
                filename: upload.filename,
                path: upload.path,
                size: upload.size.toString(),
                status: upload.status
            }
        });

    } catch (error) {
        logger.error("Unhandled upload error", { user: sessionUser.username, ip, error: String(error) });
        console.error("Upload error:", error);
        return NextResponse.json({ error: "Upload failed. Check server logs for details." }, { status: 500 });
    }
}
