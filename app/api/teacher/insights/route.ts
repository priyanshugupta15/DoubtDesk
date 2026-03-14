import { db } from "@/configs/db";
import { doubtsTable } from "@/configs/schema";
import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        // 1. Top Confusion Topics (by doubt count)
        const topTopics = await db
            .select({
                topic: doubtsTable.subTopic,
                subject: doubtsTable.subject,
                count: sql<number>`count(*)::int`,
            })
            .from(doubtsTable)
            .where(sql`${doubtsTable.subTopic} IS NOT NULL`)
            .groupBy(doubtsTable.subTopic, doubtsTable.subject)
            .orderBy(sql`count(*) DESC`)
            .limit(5);

        // 2. Solved vs Unsolved Status
        const statusDistribution = await db
            .select({
                status: doubtsTable.isSolved,
                count: sql<number>`count(*)::int`,
            })
            .from(doubtsTable)
            .groupBy(doubtsTable.isSolved);

        // 3. Subject-wise Volume
        const subjectVolume = await db
            .select({
                subject: doubtsTable.subject,
                count: sql<number>`count(*)::int`,
            })
            .from(doubtsTable)
            .groupBy(doubtsTable.subject);

        return NextResponse.json({
            topTopics,
            statusDistribution,
            subjectVolume,
        });
    } catch (error) {
        console.error("Teacher Insights failed:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
