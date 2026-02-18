/**
 * First-run seed script.
 * Creates the default 'root' admin user if no users exist in the database.
 * Run with: npx tsx scripts/seed.ts
 * Or automatically via: npm run setup
 */

import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
    const userCount = await prisma.user.count();

    if (userCount > 0) {
        console.log("✓ Database already has users. Skipping seed.");
        return;
    }

    console.log("No users found. Creating default root user...");

    const hashedPassword = await bcrypt.hash("admin", 10);
    await prisma.user.create({
        data: {
            username: "root",
            password: hashedPassword,
            role: "admin",
            quota: BigInt(10737418240), // 10 GB
            allowedFolders: "[]"
        }
    });

    console.log("✓ Created default root user.");
    console.log("  Username: root");
    console.log("  Password: admin");
    console.log("  ⚠️  Please change the password immediately after first login!");
}

main()
    .catch((e) => {
        console.error("Seed failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
