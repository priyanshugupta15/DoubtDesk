import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/configs/db';
import { doubtsTable, repliesTable, usersTable, moderationLogsTable } from '@/configs/schema';
import { eq, sql } from 'drizzle-orm';
import { moderateContent } from '@/lib/moderation';
import { sendWarningEmail, sendBlockEmail } from '@/lib/email';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const SUBJECT_LIST = 'Algebra, Calculus, Geometry, Trigonometry, Statistics, Physics, Chemistry, Biology, Operating Systems, Networking, Data Structures, Algorithms, Programming, Computer Science, Economics, Accounting, English, Other';

// PRIORITY MODELS (Vision & Text)
const VISION_MODELS = [
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "pixtral-12b-2409",
    "llama-3.2-90b-vision-preview"
];

const TEXT_MODELS = [
    "llama-3.3-70b-versatile",
    "meta-llama/llama-4-scout-17b-16e-instruct",
    "llama-3.1-70b-versatile"
];

async function callGroqWithFallback(messages: any[], isVision: boolean) {
    const models = isVision ? VISION_MODELS : TEXT_MODELS;
    let lastError = null;

    for (const model of models) {
        try {
            console.log(`Attempting Groq request with model: ${model}`);
            const completion = await groq.chat.completions.create({
                messages,
                model,
                temperature: 0.5,
                max_tokens: 2048,
                top_p: 1,
            });
            return { completion, modelUsed: model };
        } catch (err: any) {
            console.warn(`Model ${model} failed:`, err?.message);
            lastError = err;
            // Continue to next model if it's a 404, 400 (decommissioned), or 401
            if (err?.status === 404 || err?.status === 400 || err?.status === 401) continue;
            throw err; // For other errors (like rate limits), throw immediately
        }
    }
    throw lastError;
}

export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const fullName = user.fullName || (user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : "Academic Student");
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

        const body = await req.json();
        const { prompt, type = 'standard', imageBase64, classroomId } = body;

        // 1. AI Moderation Check for Prompts
        if (prompt) {
            const moderation = await moderateContent(prompt);
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
                    contentSnippet: prompt.substring(0, 100)
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

        if (!prompt && !imageBase64) {
            return NextResponse.json({ error: 'Prompt or image is required' }, { status: 400 });
        }

        let systemPrompt = `You are an expert AI Doubt Solver. Always respond in clean, well-spaced markdown.
VERY FIRST LINE of your response must be exactly this (nothing before it):
SUBJECT: [Detected Subject]
Choose the subject from: ${SUBJECT_LIST}

Then structure your response using EXACTLY these 3 sections with ## headings:
## Step-by-step explanation
## Simplified explanation
## Final Answer`;

        if (type === 'simple') {
            systemPrompt = `You are an expert AI Doubt Solver. VERY FIRST LINE must be: SUBJECT: [Detected Subject from: ${SUBJECT_LIST}]
Then write 3-5 short paragraphs using plain English and a real-world analogy. No LaTeX or formulas.`;
        } else if (type === 'exam') {
            systemPrompt = `You are a strict exam-focused AI Tutor. VERY FIRST LINE must be: SUBJECT: [Detected Subject from: ${SUBJECT_LIST}]
Then provide an EXAM-READY answer with Key Formula, Step-by-step, Common mistakes, and Examiner keywords.`;
        } else if (type === 'eli10') {
            systemPrompt = `You are a friendly AI teacher explaining to a 10-year-old. VERY FIRST LINE must be: SUBJECT: [Detected Subject from: ${SUBJECT_LIST}]
Use fun analogies, simple words, and no complex math notation unless explained by a fun story. 
Structure:
## Step-by-step explanation
## Simplified explanation
## Final Answer`;
        }

        const isVisionRequest = !!imageBase64;
        let userMessageContent: any = prompt || "Please solve the problem in the image.";

        if (isVisionRequest) {
            const visionInstruction = `Analyze the image. VERY FIRST LINE must be: SUBJECT: [Detected Subject from: ${SUBJECT_LIST}]
Then solve it using Step-by-step explanation, Simplified explanation, and Final Answer sections.
${prompt ? `Additional context from student: ${prompt}` : ''}`;

            userMessageContent = [
                { type: "text", text: visionInstruction },
                { type: "image_url", image_url: { url: imageBase64 } }
            ];
        }

        const messages: any[] = [];
        if (!isVisionRequest) messages.push({ role: "system", content: systemPrompt });
        messages.push({ role: "user", content: userMessageContent });

        const { completion, modelUsed } = await callGroqWithFallback(messages, isVisionRequest);
        let reply = completion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";

        // Extract and strip the SUBJECT line
        let subject: string = 'Other';
        const subjectMatch = reply.match(/^SUBJECT:\s*(.+)/im);
        if (subjectMatch) {
            subject = subjectMatch[1].trim();
            reply = reply.replace(/^SUBJECT:\s*.+\n?/im, '').trimStart();
        }

        // --- FULL PERSISTENCE LOGIC ---
        try {
            const [newDoubt] = await db.insert(doubtsTable).values({
                userName: fullName,
                userEmail: email || null,
                subject: subject,
                content: prompt || "Visual Inquiry",
                imageUrl: imageBase64?.slice(0, 500),
                classroomId: classroomId ? parseInt(classroomId.toString()) : null,
                type: 'ai',
                isSolved: "solved"
            }).returning();

            if (newDoubt) {
                const [aiReply] = await db.insert(repliesTable).values({
                    doubtId: newDoubt.id,
                    userName: "DoubtDesk AI",
                    type: "solution",
                    content: reply,
                }).returning();

                if (aiReply) {
                    await db.update(doubtsTable).set({ solvedReplyId: aiReply.id }).where(eq(doubtsTable.id, newDoubt.id));
                }
            }
        } catch (dbErr) {
            console.error('Failed to fully persist AI doubt and solution:', dbErr);
        }

        return NextResponse.json({ reply, subject, model: modelUsed });

    } catch (error: any) {
        console.error('Error in Groq API Flow:', error);
        return NextResponse.json(
            { error: error?.message || 'The AI service is currently overloaded or experiencing issues. Please try again in 30 seconds.' },
            { status: 500 }
        );
    }
}
