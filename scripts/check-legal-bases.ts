import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import "dotenv/config";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const count = await prisma.legalBasis.count();
  console.log("Legal bases count:", count);

  if (count > 0) {
    const bases = await prisma.legalBasis.findMany({
      select: { title: true, category: true, isActive: true },
      orderBy: { sortOrder: "asc" },
    });
    for (const b of bases) {
      console.log(`  ${b.isActive ? "+" : "-"} [${b.category}] ${b.title}`);
    }
  } else {
    console.log("No legal bases found! Run: npx tsx prisma/seed.ts");
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
