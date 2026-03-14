import { NextResponse } from 'next/server';
import { db } from '@/configs/db';
import { doubtsTable, repliesTable, membershipsTable } from '@/configs/schema';
import { desc, sql, and, isNull, eq, count, countDistinct } from 'drizzle-orm';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const classroomIdStr = searchParams.get("classroomId");
    const classroomId = classroomIdStr ? parseInt(classroomIdStr) : null;

    if (!classroomId) {
        return NextResponse.json({ error: "Classroom ID required" }, { status: 400 });
    }

    try {
        // 1. Trending Doubts
        const trendingDoubts = await db.select({
            id: doubtsTable.id,
            content: doubtsTable.content,
            subject: doubtsTable.subject,
            createdAt: doubtsTable.createdAt
        })
            .from(doubtsTable)
            .where(eq(doubtsTable.classroomId, classroomId))
            .orderBy(desc(doubtsTable.createdAt))
            .limit(5);

        // 2. Most Asked Topics (Doubt Volume)
        const mostAskedTopics = await db.select({
            subject: doubtsTable.subject,
            count: count(doubtsTable.id)
        })
            .from(doubtsTable)
            .where(eq(doubtsTable.classroomId, classroomId))
            .groupBy(doubtsTable.subject)
            .orderBy(desc(count(doubtsTable.id)))
            .limit(10);

        // 3. Resolved vs Unresolved
        const solvedStats = await db.select({
            status: doubtsTable.isSolved,
            count: count(doubtsTable.id)
        })
            .from(doubtsTable)
            .where(eq(doubtsTable.classroomId, classroomId))
            .groupBy(doubtsTable.isSolved);

        // 4. Peak Doubt Time (Hourly)
        // Note: 'extract' is standard for PostgreSQL
        const peakTime = await db.select({
            hour: sql<number>`extract(hour from ${doubtsTable.createdAt})`,
            count: count(doubtsTable.id)
        })
            .from(doubtsTable)
            .where(eq(doubtsTable.classroomId, classroomId))
            .groupBy(sql`hour`)
            .orderBy(sql`hour`);

        // 5. Student Engagement
        const engagement = await db.select({
            totalStudents: countDistinct(doubtsTable.userName),
            totalDoubts: count(doubtsTable.id)
        })
            .from(doubtsTable)
            .where(eq(doubtsTable.classroomId, classroomId));
            
        const totalReplies = await db.select({
            count: count(repliesTable.id)
        })
            .from(repliesTable)
            .innerJoin(doubtsTable, eq(repliesTable.doubtId, doubtsTable.id))
            .where(eq(doubtsTable.classroomId, classroomId));

        // 6. AI Teaching Suggestions & Weak Concept Detection (Heuristics)
        const weakTopics = mostAskedTopics.map((topic, index) => {
            const countValue = Number(topic.count);
            let suggestion = "";
            
            const subjectsMap: Record<string, string> = {
                'Programming': 'Consider dynamic coding demonstrations and live-refactoring sessions.',
                'Math': 'Focus on step-by-step problem derivation and visual geometry proofs.',
                'Calculus': 'Visualize derivatives and integrals with interactive graphs or animations.',
                'Recursion': 'Use tree diagrams and stack-overflow visualizers to trace execution flow.',
                'Physics': 'Relate equations to real-world mechanical examples or lab experiments.',
                'Chemistry': 'Use molecular modeling tools to explain bonding and reaction mechanisms.',
                'Biology': 'Utilize high-definition diagrams or 3D models for anatomical topics.',
                'Data Structures': 'Implement hands-on whiteboarding for pointer-heavy concepts like Linked Lists.',
                'Algorithms': 'Analyze time complexity through comparison of different sorting visualizers.',
                'Operating Systems': 'Simulate process scheduling and memory management scenarios.'
            };

            const baseStyle = subjectsMap[topic.subject] || 'Provide additional comprehensive practice resources and summary sheets.';

            if (countValue > 15) {
                suggestion = `Critical Alert: ${topic.subject} has reached a high doubt density. ${baseStyle} A dedicated doubt clearing session is essential immediately.`;
            } else if (countValue > 7) {
                suggestion = `Key Observation: Students are showing consistent patterns of confusion in ${topic.subject}. ${baseStyle} Consider a quick 10-minute recap in your next class.`;
            } else if (countValue > 3) {
                suggestion = `Pedagogical Note: Interest or slight confusion is emerging in ${topic.subject}. ${baseStyle} Share supplementary reading materials to maintain momentum.`;
            } else {
                suggestion = `Pulse Check: Student grasp of ${topic.subject} appears stable for now. Continue with the current curriculum plan while offering advanced elective challenges.`;
            }

            return {
                ...topic,
                count: countValue,
                severity: countValue > 15 ? 'High' : countValue > 7 ? 'Medium' : 'Low',
                suggestion
            };
        });

        return NextResponse.json({
            trendingDoubts,
            mostAskedTopics: weakTopics, 
            solvedStats,
            peakTime,
            engagement: {
                ...engagement[0],
                totalReplies: totalReplies[0]?.count || 0
            },
            weakTopics: weakTopics.filter(t => t.severity !== 'Low')
        });

    } catch (error: any) {
        console.error('Error fetching analytics:', error);
        return NextResponse.json({
            trendingDoubts: [],
            mostAskedTopics: [],
            solvedStats: [],
            peakTime: [],
            engagement: { totalStudents: 0, totalDoubts: 0, totalReplies: 0 },
            weakTopics: []
        });
    }
}
