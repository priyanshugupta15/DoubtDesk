import { db } from "@/configs/db";
import { repliesTable } from "@/configs/schema";
import { eq, asc } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const doubtId = searchParams.get("doubtId");

        if (!doubtId) {
            return NextResponse.json({ error: "Doubt ID required" }, { status: 400 });
        }

        const data = await db.select()
            .from(repliesTable)
            .where(eq(repliesTable.doubtId, parseInt(doubtId)))
            .orderBy(asc(repliesTable.createdAt));

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching replies:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const { doubtId, userName, type, content, imageUrl } = await req.json();

        if (!doubtId || !userName || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newReply = await db.insert(repliesTable).values({
            doubtId: parseInt(doubtId),
            userName,
            type,
            content: content || null,
            imageUrl: imageUrl || null
        }).returning();

        return NextResponse.json(newReply[0]);
    } catch (error) {
        console.error("Error creating reply:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
