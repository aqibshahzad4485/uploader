import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userData = await prisma.user.findUnique({
        where: { id: user.id },
        select: { id: true, username: true, role: true, quota: true }
    });

    if (!userData) return NextResponse.json({ error: "User not found" }, { status: 404 });

    // Calculate usage for current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const usageResult = await prisma.upload.aggregate({
        _sum: { size: true },
        where: {
            userId: user.id,
            createdAt: { gte: startOfMonth }
        }
    });

    const usage = usageResult._sum.size || BigInt(0);

    return NextResponse.json({
        ...userData,
        quota: userData.quota.toString(),
        usage: usage.toString()
    });
}
