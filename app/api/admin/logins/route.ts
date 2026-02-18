
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { limit } = Object.fromEntries(new URL(req.url).searchParams);

    try {
        const logins = await prisma.loginLog.findMany({
            orderBy: { createdAt: "desc" },
            take: limit ? parseInt(limit) : undefined
        });
        return NextResponse.json(logins);
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch logs" }, { status: 500 });
    }
}
