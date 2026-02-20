/**
 * Password reset script.
 * Resets the password for any user by username.
 *
 * Usage:
 *   npx tsx scripts/reset-password.ts <username> <new-password>
 *
 * Examples:
 *   npx tsx scripts/reset-password.ts root admin
 *   npx tsx scripts/reset-password.ts aqib MyNewPass123
 */

import prisma from "../lib/prisma";
import bcrypt from "bcryptjs";

async function main() {
    const [, , username, newPassword] = process.argv;

    if (!username || !newPassword) {
        console.error("Usage: npx tsx scripts/reset-password.ts <username> <new-password>");
        process.exit(1);
    }

    const user = await prisma.user.findUnique({ where: { username } });

    if (!user) {
        console.error(`✗ User '${username}' not found.`);
        process.exit(1);
    }

    const hashed = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { username },
        data: { password: hashed },
    });

    console.log(`✓ Password for '${username}' has been reset.`);
    console.log(`  Username: ${username}`);
    console.log(`  Password: ${newPassword}`);
    console.log(`  ⚠️  Change it again from the Admin Panel after logging in.`);
}

main()
    .catch((e) => {
        console.error("Reset failed:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
