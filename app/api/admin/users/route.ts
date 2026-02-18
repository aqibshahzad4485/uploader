import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import prisma from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
        select: { id: true, username: true, role: true, quota: true, createdAt: true }
    });

    const formattedUsers = users.map(u => ({
        ...u,
        quota: u.quota.toString()
    }));

    return NextResponse.json(formattedUsers);
}

export async function POST(req: Request) {
    const user = await getCurrentUser();
    if (!user || user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { username, password, role, quota } = await req.json();

    if (!username || !password) {
        return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    // Default quota 10GB if not specified
    const quotaBigInt = quota ? BigInt(quota) : BigInt(10 * 1024 * 1024 * 1024);

    try {
        const newUser = await prisma.user.create({
            data: {
                username,
                password: hashedPassword,
                role: role || "user",
                quota: quotaBigInt
            }
        });

        return NextResponse.json({
            success: true,
            user: { ...newUser, quota: newUser.quota.toString() }
        });
    } catch (e) {
        return NextResponse.json({ error: "User creation failed (username exists?)" }, { status: 500 });
    }
}
