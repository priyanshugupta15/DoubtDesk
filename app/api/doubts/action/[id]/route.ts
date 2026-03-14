import { db } from "@/configs/db";
import { doubtsTable, likesTable } from "@/configs/schema";
import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { action, content, subject, imageUrl, userName, replyId } = await req.json();
        const { id } = await params;
        const doubtId = parseInt(id);

        if (isNaN(doubtId)) {
            return NextResponse.json({ error: "Invalid doubt ID" }, { status: 400 });
        }

        if (action === "like") {
            if (!userName) {
                return NextResponse.json({ error: "User name required for like" }, { status: 400 });
            }

            // Check if already liked
            const existingLike = await db.select()
                .from(likesTable)
                .where(and(eq(likesTable.userName, userName), eq(likesTable.doubtId, doubtId)))
                .limit(1);

            if (existingLike.length > 0) {
                // Unlike: Remove from likesTable and decrement likes in doubtsTable
                await db.delete(likesTable)
                    .where(and(eq(likesTable.userName, userName), eq(likesTable.doubtId, doubtId)));
                
                const updated = await db.update(doubtsTable)
                    .set({ likes: sql`${doubtsTable.likes} - 1` })
                    .where(eq(doubtsTable.id, doubtId))
                    .returning();
                
                return NextResponse.json({ ...updated[0], hasLiked: false });
            } else {
                // Like: Add to likesTable and increment likes in doubtsTable
                await db.insert(likesTable).values({
                    userName,
                    doubtId
                });

                const updated = await db.update(doubtsTable)
                    .set({ likes: sql`${doubtsTable.likes} + 1` })
                    .where(eq(doubtsTable.id, doubtId))
                    .returning();
                
                return NextResponse.json({ ...updated[0], hasLiked: true });
            }
        }

        if (action === "solve") {
            const doubt = await db.select().from(doubtsTable).where(eq(doubtsTable.id, doubtId)).limit(1);
            if (doubt.length === 0) return NextResponse.json({ error: "Doubt not found" }, { status: 404 });
            
            // Toggle logic: 
            // 1. If same replyId is passed, unmark it (set to unsolved)
            // 2. If different replyId, mark that one as solved
            // 3. If no replyId (from main card), just toggle solved/unsolved
            
            let newStatus = doubt[0].isSolved === "solved" ? "unsolved" : "solved";
            let newSolvedReplyId = replyId || null;

            if (replyId && doubt[0].solvedReplyId === replyId) {
                newStatus = "unsolved";
                newSolvedReplyId = null;
            } else if (replyId) {
                newStatus = "solved";
                newSolvedReplyId = replyId;
            }

            const updated = await db.update(doubtsTable)
                .set({ 
                    isSolved: newStatus,
                    solvedReplyId: newSolvedReplyId 
                })
                .where(eq(doubtsTable.id, doubtId))
                .returning();
            return NextResponse.json(updated[0]);
        }

        if (action === "edit") {
            const updated = await db.update(doubtsTable)
                .set({ 
                    content: content || null, 
                    subject, 
                    imageUrl: imageUrl || null 
                })
                .where(eq(doubtsTable.id, doubtId))
                .returning();
            return NextResponse.json(updated[0]);
        }

        return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    } catch (error) {
        console.error("Error updating doubt:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const { id } = await params;
        const doubtId = parseInt(id);
        await db.delete(doubtsTable).where(eq(doubtsTable.id, doubtId));
        return NextResponse.json({ message: "Doubt deleted successfully" });
    } catch (error) {
        console.error("Error deleting doubt:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
