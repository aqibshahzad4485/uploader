import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

// Helper to get monthly usage
async function getMonthlyUsage(userId: number) {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const uploads = await prisma.upload.findMany({
        where: {
            userId: userId,
            createdAt: { gte: startOfMonth }
        },
        select: { size: true }
    });

    return uploads.reduce((acc, curr) => acc + curr.size, BigInt(0));
}

export async function GET(req: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
        select: { id: true, username: true, role: true, quota: true, allowedFolders: true, createdAt: true }
    });

    // Calculate usage for each user
    const formattedUsers = await Promise.all(users.map(async (u) => {
        const usage = await getMonthlyUsage(u.id);
        return {
            ...u,
            quota: u.quota.toString(),
            usage: usage.toString()
        };
    }));

    return NextResponse.json(formattedUsers);
}

export async function POST(req: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { username, password, role, quota, allowedFolders } = await req.json();

    if (!username || !password) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Default 10GB if not specified
    const quotaBigInt = quota ? BigInt(quota) : BigInt(10737418240);
    const foldersJson = allowedFolders ? JSON.stringify(allowedFolders) : "[]";

    try {
        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: role || "user",
                quota: quotaBigInt,
                allowedFolders: foldersJson
            }
        });

        return NextResponse.json({
            success: true,
            user: { ...newUser, quota: newUser.quota.toString() }
        });
    } catch (e) {
        return NextResponse.json({ error: "User creation failed" }, { status: 500 });
    }
}

export async function PUT(req: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { id, password, quota, allowedFolders } = await req.json();
    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });

    if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Root user protection
    if (targetUser.username === "root" && user.username !== "root") {
        return NextResponse.json({ error: "Cannot edit root user" }, { status: 403 });
    }

    const data: any = {};
    if (password && password.trim() !== "") {
        data.password = await bcrypt.hash(password, 10);
    }
    if (quota) {
        data.quota = BigInt(quota);
    }
    if (allowedFolders) {
        data.allowedFolders = JSON.stringify(allowedFolders);
    }

    try {
        const updatedUser = await prisma.user.update({
            where: { id: parseInt(id) },
            data
        });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Update failed" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") return NextResponse.json({ error: "Unauthorized" }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) return NextResponse.json({ error: "Missing ID" }, { status: 400 });

    // Check if trying to delete self
    if (parseInt(id) === user.id) {
        return NextResponse.json({ error: "Cannot delete yourself" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({ where: { id: parseInt(id) } });
    if (targetUser && targetUser.username === "root") {
        return NextResponse.json({ error: "Cannot delete root user" }, { status: 403 });
    }

    try {
        // Delete uploads first or use cascade if configured (Prisma doesn't auto-cascade commonly without setup)
        await prisma.upload.deleteMany({ where: { userId: parseInt(id) } });
        await prisma.user.delete({ where: { id: parseInt(id) } });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Delete failed" }, { status: 500 });
    }
}
