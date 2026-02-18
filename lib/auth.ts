import jwt from "jsonwebtoken";
import { headers } from "next/headers";
import prisma from "@/lib/prisma";

const JWT_SECRET = process.env.JWT_SECRET || "super-secret-key-change-me";

export async function signToken(payload: any) {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export async function verifyToken(token: string) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

export async function getCurrentUser() {
    try {
        const headersList = await headers();
        const token = headersList.get("Authorization")?.split(" ")[1];

        if (!token) return null;

        const decoded = await verifyToken(token) as any;
        if (!decoded || !decoded.id) return null;

        const user = await prisma.user.findUnique({
            where: { id: decoded.id },
            select: { id: true, username: true, role: true, quota: true, allowedFolders: true }
        });

        return user;
    } catch (error) {
        return null;
    }
}
