import { GoogleGenAI } from '@google/genai';

// IMPORTANT: Never commit your real API key.
// In a real app, you'd use a proxy server or Vite env vars (.env.local)
// For this local personal app, you can input it in the UI and save to localStorage.

export const initGeminiAPI = (apiKey) => {
    if (!apiKey) return null;
    // Initialize the new Google Gen AI SDK
    return new GoogleGenAI({ apiKey: apiKey });
};

export const generateChatResponse = async (ai, character, chatHistory, userMessage, activePersona) => {
    try {
        // 1. Build context based on character instruction
        let systemInstruction = character.systemPrompt;

        // Add global OOC instruction
        systemInstruction += `\n\n[OOC (Out Of Character) / 시스템 절대 규칙]
사용자가 괄호 ( )를 사용하거나 'OOC:' 등의 키워드로 역할극 밖의 대화나 지시를 건넬 경우, 캐릭터의 입장을 잠시 벗어나 디렉터로서 사용자의 피드백이나 지시에 순응하여 롤플레잉 외적인 답변을 수행하십시오.`;

        // Add Active Persona Context
        if (activePersona) {
            systemInstruction += `\n\n[현재 대화하는 상대(유저)의 설정]
이름: ${activePersona.name}
배경 및 성격: ${activePersona.personaPrompt}
당신은 위 설정의 유저와 대화하고 있습니다. 역할극의 몰입을 위해 유저의 설정에 맞추어 유저를 대우하며 반응하십시오.`;
        }


        // Add instruction for image mapping behavior
        if (character.imageMap && character.imageMap.length > 0) {
            const situationsList = character.imageMap.map(img => `[${img.situation}]`).join(', ');
            systemInstruction += `\n\n[최우선 필수 지시사항]
대화의 맥락에 따라 현재 당신의 감정이나 상황을 파악하여, *반드시* 답변의 가장 첫 부분에 다음 중 하나의 태그를 대괄호로 감싸서 출력하십시오.
사용 가능한 태그 (이 중에서만 선택하고 절대 새로운 태그를 만들지 마세요): ${situationsList}
예시: "${character.imageMap[0] ? `[${character.imageMap[0].situation}]` : '[평온]'
                } 흥, 네가 웬일이냐?"
수칙:
1. 태그명은 반드시 제시된 것과 정확히 일치해야 합니다. (오타 금지)
2. 답변을 시작할 때 단 한 번만 태그를 작성하세요.`;
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
