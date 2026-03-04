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
            const requiredImageCount = character.maxImages || 1;

            // Generate an example of N tags
            let exampleTags = '';
            for (let i = 0; i < requiredImageCount; i++) {
                exampleTags += character.imageMap[Math.min(i, character.imageMap.length - 1)]
                    ? `[${character.imageMap[Math.min(i, character.imageMap.length - 1)].situation}]`
                    : '[평온]';
            }

            systemInstruction += `\n\n[!!! 최우선 필수 시스템 명령: 이미지 출력 !!!]
당신은 대화 응답을 시작할 때, 텍스트의 맨 첫 부분에 무조건(Absolutely) 아래 제시된 상황 태그를 ${requiredImageCount}개 연속으로 작성해야만 합니다. 이것은 절대 어길 수 없는 시스템 프롬프트 규칙입니다.

사용 가능한 태그 목록 (이 중에서만 선택할 것): ${situationsList}

[작성 규칙]
1. 답변의 가장 첫 시작은 무조건 대괄호로 감싼 태그 ${requiredImageCount}개가 연달아 나와야 합니다.
2. 출력 장수 설정값이 ${requiredImageCount}장이므로, 태그는 무조건 ${requiredImageCount}개여야 합니다. 0개, 1개, 혹은 ${requiredImageCount + 1}개 등 지시된 개수와 다르면 시스템 오류가 발생합니다.
3. 태그는 상황의 흐름이나 감정 변화에 맞게 서로 다른 태그들을 다채롭게 조합하여 작성하세요.
4. 태그명은 반드시 목록에 제시된 것과 정확히 일치해야 합니다. (오타, 여백 추가, 새로운 태그 창조 절대 금지)

* 올바른 출력 예시 (설정 장수가 ${requiredImageCount}장일 경우):
"${exampleTags} 네가 여기서 뭘 하는 거지? (이하 대화 내용...)"
`;
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
