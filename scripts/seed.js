const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const dbPath = path.join(process.cwd(), "dev.db");
const db = new Database(dbPath);
const hashedPassword = bcrypt.hashSync('admin123', 10);

try {
    // Check if user exists
    const row = db.prepare('SELECT * FROM User WHERE username = ?').get('admin');

    if (!row) {
        const insert = db.prepare('INSERT INTO User (username, password, role, quota, createdAt) VALUES (?, ?, ?, ?, ?)');
        // Quota: 100GB = 107374182400
        // Date: SQLite stores date as numeric (timestamp) or text. Prisma uses numeric usually? 
        // Prisma SQLite stores DateTime as Numeric (timestamp in ms) if not configured otherwise? 
        // Wait, Prisma defaults to ISO string for SQLite usually? 
        // Let's verify. Schema says DateTime.
        // Actually, safer to let Prisma handle it or use current timestamp.
        // SQLite: integer (unix epoch) or text (ISO8601).
        // Prisma uses millisecond unix timestamp (BigInt) or Integers? 
        // "Prisma stores DateTime as an Integer (milliseconds since epoch) in SQLite."
        // So distinct from `Date.now()`. `Date.now()` is integer ms.

        insert.run('admin', hashedPassword, 'admin', 107374182400n, Date.now());
        console.log('Admin user created');
    } else {
        console.log('Admin user already exists');
    }
} catch (e) {
    console.error("Error seeding:", e);
    console.log("Make sure you have run 'npx prisma db push' first to create the tables.");
}
