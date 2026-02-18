
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    try {
        const config = await prisma.systemConfig.findUnique({
            where: { key: "retentionDays" }
        });
        return NextResponse.json({ retentionDays: config ? config.value : "30" });
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch config" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check if master/root
    if (user.username !== "root") {
        return NextResponse.json({ error: "Only master can change system settings" }, { status: 403 });
    }

    const { retentionDays } = await req.json();

    try {
        await prisma.systemConfig.upsert({
            where: { key: "retentionDays" },
            update: { value: retentionDays.toString() },
            create: { key: "retentionDays", value: retentionDays.toString() }
        });
        return NextResponse.json({ success: true });
    } catch (e) {
        return NextResponse.json({ error: "Failed to save config" }, { status: 500 });
    }
}
