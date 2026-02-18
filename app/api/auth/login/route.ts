import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { signToken } from "@/lib/auth";
import { logger } from "@/lib/logger";

const cleanOldLogs = async () => {
    try {
        let retentionDays = 30; // Default
        const config = await prisma.systemConfig.findUnique({ where: { key: "retentionDays" } });
        if (config) {
            retentionDays = parseInt(config.value);
        }

        const dateThreshold = new Date();
        dateThreshold.setDate(dateThreshold.getDate() - retentionDays);

        // Clean login logs older than retention period
        await prisma.loginLog.deleteMany({
            where: { createdAt: { lt: dateThreshold } }
        });
    } catch (e) {
        console.error("Cleanup error:", e);
    }
};

export async function POST(req: Request) {
    let ip = (req.headers.get("x-forwarded-for") ?? "127.0.0.1").split(",")[0].trim();
    if (ip.startsWith("::ffff:")) ip = ip.substring(7);
    const userAgent = req.headers.get("user-agent") ?? "Unknown";

    try {
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json(
                { error: "Username and password are required" },
                { status: 400 }
            );
        }

        const user = await prisma.user.findUnique({
            where: { username },
        });

        // Log failure
        if (!user || !(await bcrypt.compare(password, user.password))) {
            await prisma.loginLog.create({
                data: { username: username || "Unknown", success: false, ip, userAgent }
            });
            logger.login(username || "Unknown", false, ip, userAgent);
            return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
        }

        // Log success
        await prisma.loginLog.create({
            data: { username: user.username, success: true, ip, userAgent }
        });
        logger.login(user.username, true, ip, userAgent);

        // Trigger cleanup (fire and forget)
        cleanOldLogs();

        const token = await signToken({ id: user.id, username: user.username, role: user.role });

        return NextResponse.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                quota: user.quota.toString()
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        return NextResponse.json(
            { error: "Something went wrong" },
            { status: 500 }
        );
    }
}
