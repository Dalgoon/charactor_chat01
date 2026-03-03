import { GoogleGenAI } from '@google/genai';

// IMPORTANT: Never commit your real API key.
// In a real app, you'd use a proxy server or Vite env vars (.env.local)
// For this local personal app, you can input it in the UI and save to localStorage.

export const initGeminiAPI = (apiKey) => {
    if (!apiKey) return null;
    // Initialize the new Google Gen AI SDK
    return new GoogleGenAI({ apiKey: apiKey });
};

export const generateChatResponse = async (ai, character, chatHistory, userMessage) => {
    try {
        // 1. Build context based on character instruction
        let systemInstruction = character.systemPrompt;

        // Add instruction for image mapping behavior
        if (character.imageMap && character.imageMap.length > 0) {
            const situationsList = character.imageMap.map(img => `[${img.situation}]`).join(', ');
            systemInstruction += `\n\n[필수 지시사항]
대화의 맥락에 따라 현재 당신의 감정이나 상황을 파악하여, *반드시* 모든 문장의 맨 앞에 다음 중 하나의 태그로 감싸서 출력해. 태그 뒤에는 한 칸 띄우고 대사를 작성해.
사용 가능한 태그: ${situationsList}
예시: "${character.imageMap[0] ? `[${character.imageMap[0].situation}]` : '[평온]'
                } 흥, 네가 웬일이냐?"\n절대 태그를 빠뜨리지 마.`;
        }

        // 2. Format chat history for the API
        const history = chatHistory.map(msg => ({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.text }]
        }));

        // Determine maximum output tokens depending on model choice
        const maxTokens = character.model === 'gemini-2.5-pro' ? 8192 : 4096;

        // Start a chat session
        const chatWithHistory = ai.chats.create({
            model: character.model || 'gemini-2.5-flash',
            config: {
                systemInstruction: systemInstruction,
                temperature: 0.9,
                maxOutputTokens: maxTokens,
                safetySettings: [
                    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
                    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
                ],
            },
            // Pass the existing history into the chat context
            history: history
        });

        const response = await chatWithHistory.sendMessage({ message: userMessage });
        return response.text;

    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
};
