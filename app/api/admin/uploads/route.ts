import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(req: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const limit = searchParams.get('limit');

    // take undefined = all records
    const uploads = await prisma.upload.findMany({
        orderBy: { createdAt: 'desc' },
        take: limit ? parseInt(limit) : undefined,
        include: { user: { select: { username: true, role: true } } }
    });

    return NextResponse.json(uploads.map((u: typeof uploads[number]) => ({
        ...u,
        size: u.size.toString()
    })));
}
