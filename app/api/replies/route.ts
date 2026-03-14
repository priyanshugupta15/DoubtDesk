import { db } from "@/configs/db";
import { repliesTable, doubtsTable, classroomsTable } from "@/configs/schema";
import { eq, asc, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import { moderateContent } from "@/lib/moderation";
import { sendWarningEmail, sendBlockEmail } from "@/lib/email";
import { usersTable, moderationLogsTable } from "@/configs/schema";

export async function GET(req: Request) {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const email = user.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        // 0. Check if user is blocked
        const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
        if (dbUser?.blockedUntil && new Date(dbUser.blockedUntil) > new Date()) {
            const unlockDate = new Date(dbUser.blockedUntil).toDateString();
            return NextResponse.json({ 
                error: `Your account is temporarily blocked due to safety violations. Access will be restored on ${unlockDate}.` 
            }, { status: 403 });
        }

        const { searchParams } = new URL(req.url);
        const doubtIdStr = searchParams.get("doubtId");

        if (!doubtIdStr) {
            return NextResponse.json({ error: "Doubt ID required" }, { status: 400 });
        }
        const doubtId = parseInt(doubtIdStr);

        // Security: Verify doubt visibility
        const [doubt] = await db.select().from(doubtsTable).where(eq(doubtsTable.id, doubtId));
        if (!doubt) return NextResponse.json({ error: "Doubt not found" }, { status: 404 });

        if (doubt.type === 'teacher') {
            const [room] = await db.select().from(classroomsTable).where(eq(classroomsTable.id, doubt.classroomId!));
            const isTeacher = room && email && room.teacherEmail === email;
            const isOwner = email && doubt.userEmail === email;

            if (!isTeacher && !isOwner) {
                return NextResponse.json({ error: "Access denied" }, { status: 403 });
            }
        }

        const data = await db.select()
            .from(repliesTable)
            .where(eq(repliesTable.doubtId, doubtId))
            .orderBy(asc(repliesTable.createdAt));

        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching replies:", error);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        const email = user.primaryEmailAddress?.emailAddress;
        if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

        // 0. Check if user is blocked
        const [dbUser] = await db.select().from(usersTable).where(eq(usersTable.email, email));
        if (dbUser?.blockedUntil && new Date(dbUser.blockedUntil) > new Date()) {
            const unlockDate = new Date(dbUser.blockedUntil).toDateString();
            return NextResponse.json({ 
                error: `Your account is temporarily blocked due to safety violations. Access will be restored on ${unlockDate}.` 
            }, { status: 403 });
        }

        const { doubtId, userName, type, content, imageUrl } = await req.json();

        if (!doubtId || !userName || !type) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // 1. AI Moderation Check
        if (content) {
            const moderation = await moderateContent(content);
            if (!moderation.isAllowed) {
                // Increment strikes
                const newViolationCount = (dbUser?.violationCount || 0) + 1;
                const isThirdViolation = newViolationCount >= 3;
                let blockedUntil: Date | null = null;
                let newBlockCount = dbUser?.blockCount || 0;

                if (isThirdViolation) {
                    newBlockCount += 1;
                    // Duration: 3 days (1), 1 week (2), 2 weeks (3), etc.
                    let durationDays = 3;
                    if (newBlockCount === 2) durationDays = 7;
                    else if (newBlockCount >= 3) durationDays = 14 * Math.pow(2, newBlockCount - 3);

                    blockedUntil = new Date();
                    blockedUntil.setDate(blockedUntil.getDate() + durationDays);
                    
                    // Send Block Email
                    await sendBlockEmail(email, durationDays, newBlockCount);
                }

                await db.update(usersTable)
                    .set({
                        violationCount: newViolationCount,
                        isBlocked: isThirdViolation,
                        blockedUntil: blockedUntil,
                        blockCount: newBlockCount
                    })
                    .where(eq(usersTable.email, email));

                // Log violation
                await db.insert(moderationLogsTable).values({
                    userEmail: email,
                    reason: moderation.reason,
                    violationType: moderation.violationType || 'other',
                    contentSnippet: content.substring(0, 100)
                });

                // Send Email Warning (Simulation)
                await sendWarningEmail(email, moderation.reason, newViolationCount);

                let errorMessage = `Content flagged: ${moderation.reason}. This is strike ${newViolationCount}/3. Please stick to academic topics.`;
                if (isThirdViolation && blockedUntil) {
                    const unlockDate = blockedUntil.toDateString();
                    errorMessage = `Content flagged. Your account is now blocked for ${newBlockCount > 1 ? 'additional ' : ''}violations. Access restored on ${unlockDate}.`;
                }

                return NextResponse.json({ error: errorMessage }, { status: 400 });
            }
        }

        // Security: Check if it's a teacher doubt
        const [doubt] = await db.select().from(doubtsTable).where(eq(doubtsTable.id, parseInt(doubtId)));
        if (doubt?.type === 'teacher') {
            const [room] = await db.select().from(classroomsTable).where(eq(classroomsTable.id, doubt.classroomId!));
            if (room && email && room.teacherEmail !== email) {
                return NextResponse.json({ error: "Only the teacher can reply to this doubt" }, { status: 403 });
            }
        }

        const newReply = await db.insert(repliesTable).values({
            doubtId: parseInt(doubtId),
            userName,
            type,
            content: content || null,
            imageUrl: imageUrl || null
        }).returning();

        return NextResponse.json(newReply[0]);
    } catch (error: any) {
        console.error("Error creating reply:", error);
        return NextResponse.json({ error: error?.message || "Internal Server Error" }, { status: 500 });
    }
}
