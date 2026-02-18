import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const uploads = await prisma.upload.findMany({
        orderBy: { createdAt: 'desc' },
        take: 50,
        include: { user: { select: { username: true } } }
    });

    return NextResponse.json(uploads.map(u => ({
        ...u,
        size: u.size.toString()
    })));
}
