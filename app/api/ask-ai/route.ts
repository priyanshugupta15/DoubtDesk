import { NextResponse } from 'next/server';
import Groq from 'groq-sdk';
import { currentUser } from '@clerk/nextjs/server';

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

const SUBJECT_LIST = 'Mathematics, Physics, Chemistry, Biology, Data Structures, Algorithms, Programming, Computer Science, Economics, Accounting, Statistics, History, Geography, English, General Knowledge, Other';

export async function POST(req: Request) {
    try {
        const user = await currentUser();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await req.json();
        const { prompt, type = 'standard', imageBase64 } = body;

        if (!prompt && !imageBase64) {
            return NextResponse.json({ error: 'Prompt or image is required' }, { status: 400 });
        }

        let systemPrompt = `You are an expert AI Doubt Solver. Always respond in clean, well-spaced markdown.

VERY FIRST LINE of your response must be exactly this (nothing before it):
SUBJECT: [Detected Subject]

Choose the subject from: ${SUBJECT_LIST}

Then structure your response using EXACTLY these 3 sections with ## headings:

## Step-by-step explanation

STRICT FORMATTING RULES:
- Number each step: **Step 1 –**, **Step 2 –**, **Step 3 –**, etc.
- Leave a blank line between each step
- Every formula or equation MUST be on its own line using display math: $$formula here$$
- NEVER write multiple calculations on the same line
- NEVER use inline math ($...$) for fractions or equations with an equals sign

TABLE RULES (critical):
- Use GitHub markdown tables for tabular data
- Every header column MUST have a matching separator: | --- |
- NEVER use raw | inside table cells for math — use \\left\\lvert x \\right\\rvert for absolute value
- Keep column count consistent in every row

## Simplified explanation

Write 2-4 short paragraphs in plain English. Use a real-world analogy. No formulas.

## Final Answer

State the result clearly in **bold**. One or two sentences max.`;

        if (type === 'simple') {
            systemPrompt = `You are an expert AI Doubt Solver.
VERY FIRST LINE must be: SUBJECT: [Detected Subject from: ${SUBJECT_LIST}]
Then write 3-5 short paragraphs using plain English and a real-world analogy. No LaTeX or formulas. Blank line between each paragraph.`;
        } else if (type === 'exam') {
            systemPrompt = `You are a strict exam-focused AI Tutor.
VERY FIRST LINE must be: SUBJECT: [Detected Subject from: ${SUBJECT_LIST}]
Then provide an EXAM-READY answer:

**Key Formula / Concept:**
(state the main formula or rule)

**Step-by-step approach:**
- Bullet each step on its own line
- Show each calculation on its own line using $$...$$

**Common mistakes to avoid:**
- List 2-3 concise bullet points

**Examiner keywords to use:**
- List important terms`;
        }

        const isVisionRequest = !!imageBase64;
        const modelToUse = isVisionRequest ? "meta-llama/llama-4-scout-17b-16e-instruct" : "llama-3.3-70b-versatile";

        let userMessageContent: any = prompt || "Please solve the problem in the image.";

        const visionInstruction = `Analyze the image. Extract the math problem or question visible in it.

VERY FIRST LINE must be: SUBJECT: [Detected Subject from: ${SUBJECT_LIST}]

Then solve it using this EXACT structure:

## Step-by-step explanation
Number each step (**Step 1 –**, **Step 2 –**, etc.) with a blank line between each.
Put every calculation or formula on its OWN line using: $$...$$

## Simplified explanation
2-4 short paragraphs, plain English, real-world analogy.

## Final Answer
The final result in **bold**, 1-2 sentences.

${prompt ? `Additional context from student: ${prompt}` : ''}`;

        if (isVisionRequest) {
            userMessageContent = [
                { type: "text", text: visionInstruction },
                { type: "image_url", image_url: { url: imageBase64 } }
            ];
        }

        const messages: any[] = [];
        if (!isVisionRequest) {
            messages.push({ role: "system", content: systemPrompt });
        }
        messages.push({ role: "user", content: userMessageContent });

        const chatCompletion = await groq.chat.completions.create({
            messages,
            model: modelToUse,
            temperature: 0.5,
            max_tokens: 2048,
            top_p: 1,
        });

        let reply = chatCompletion.choices[0]?.message?.content || "Sorry, I couldn't generate a response.";

        // Extract and strip the SUBJECT line from the reply
        let subject: string | null = null;
        const subjectMatch = reply.match(/^SUBJECT:\s*(.+)/im);
        if (subjectMatch) {
            subject = subjectMatch[1].trim();
            reply = reply.replace(/^SUBJECT:\s*.+\n?/im, '').trimStart();
        }

        return NextResponse.json({ reply, subject });

    } catch (error: any) {
        console.error('Error in Groq API:', error);
        return NextResponse.json(
            { error: error?.message || 'Something went wrong while processing your request.' },
            { status: 500 }
        );
    }
}
