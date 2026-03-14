import { Groq } from "groq-sdk";

const groq = new Groq({
    apiKey: process.env.GROQ_API_KEY,
});

export interface ModerationResult {
    isAllowed: boolean;
    reason: string;
    violationType?: 'abusive' | 'off-topic' | 'spam' | 'other';
}

export async function moderateContent(content: string): Promise<ModerationResult> {
    if (!content || content.trim().length === 0) {
        return { isAllowed: true, reason: "Empty content" };
    }

    try {
        const response = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `You are a content moderator for an academic platform called DoubtDesk. 
                    Your task is to analyze if the provided content is related to studies, academic subjects, career guidance, or technical questions.
                    You must also check for abusive language, hate speech, harassment, or inappropriate non-academic content.
                    
                    Return a JSON object with:
                    {
                        "isAllowed": boolean,
                        "reason": "short explanation in English",
                        "violationType": "abusive" | "off-topic" | "spam" | "other" (only if isAllowed is false)
                    }`
                },
                {
                    role: "user",
                    content: `Analyze this content: "${content}"`
                }
            ],
            model: "llama-3.3-70b-versatile",
            response_format: { type: "json_object" }
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");
        return {
            isAllowed: result.isAllowed ?? true,
            reason: result.reason ?? "Content looks good",
            violationType: result.violationType
        };
    } catch (error) {
        console.error("Moderation error:", error);
        // Fallback to allow if AI fails, to avoid blocking legitimate users
        return { isAllowed: true, reason: "Moderation service unavailable" };
    }
}
