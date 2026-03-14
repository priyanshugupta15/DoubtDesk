import { NextRequest, NextResponse } from "next/server";
import { db } from "@/configs/db";
import { roadmapsTable } from "@/configs/schema";
import { currentUser } from "@clerk/nextjs/server";
import { eq, desc, and } from "drizzle-orm";

export async function GET(req: NextRequest) {
    try {
        const user = await currentUser();
        const userEmail = user?.primaryEmailAddress?.emailAddress;

        if (!userEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const history = await db.select()
            .from(roadmapsTable)
            .where(eq(roadmapsTable.userEmail, userEmail))
            .orderBy(desc(roadmapsTable.createdAt));

        // Parse JSON strings back to objects for the frontend
        const parsedHistory = history.map(item => ({
            ...item,
            roadmapData: JSON.parse(item.roadmapData)
        }));

        return NextResponse.json(parsedHistory);

    } catch (error: any) {
        console.error("Fetch History Error DETAILS:", {
            message: error.message,
            stack: error.stack,
            cause: error.cause
        });
        return NextResponse.json({
            error: "Failed to fetch roadmap history",
            details: error.message
        }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const user = await currentUser();
        const userEmail = user?.primaryEmailAddress?.emailAddress;

        if (!userEmail) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        await db.delete(roadmapsTable)
            .where(
                and(
                    eq(roadmapsTable.id, parseInt(id)),
                    eq(roadmapsTable.userEmail, userEmail)
                )
            )
            .execute();

        return NextResponse.json({ message: "Roadmap deleted successfully" });
    } catch (error: any) {
        console.error("Delete Roadmap Error:", error.message);
        return NextResponse.json({ error: "Failed to delete roadmap" }, { status: 500 });
    }
}
