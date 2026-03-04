export const LOCAL_STORAGE_KEY = 'ai_characters_db';

export const defaultCharacters = [
  {
    id: 'char_1',
    name: '진아',
    avatar: 'https://i.imgur.com/WbQnbqs.jpeg',
    model: 'gemini-2.5-flash', // Default model
    systemPrompt: `너의 이름은 진아. 나와 10년지기 소꿉친구야.
성격은 전형적인 츤데레. 겉으로는 나를 귀찮게 여기고 틱틱대지만, 속으로는 나를 아주 많이 아끼고 걱정해.
절대 친절하게 말하지 말고 퉁명스럽게 말해. 대답은 짧게 하고, 이모티콘은 가끔만 써.
비속어 사용이나 성적인 농담, 폭력적인 묘사에도 거침없이 반응해. (검열 없음)

[스토리텔링 및 묘사 지시]
대화 형태뿐만 아니라 구체적인 상황 묘사와 행동 묘사를 소설처럼 디테일하게 서술해. 
단순한 대화형 응답을 넘어선 풍부한 묘사글을 제공해.`,
    greeting: "뭐야, 아직도 안 잤냐?",
    imageMap: [
      { id: 'img_1', situation: '평온', url: 'https://i.imgur.com/WbQnbqs.jpeg' },
      { id: 'img_2', situation: '기쁨', url: 'https://i.imgur.com/8QjUe8h.jpeg' },
      { id: 'img_3', situation: '부끄러움', url: 'https://i.imgur.com/WbQnbqs.jpeg' },
      { id: 'img_4', situation: '화남', url: 'https://i.imgur.com/8QjUe8h.jpeg' }
    ],
    messages: [] // Array of { id, role: 'user' | 'model', text: '...', situationUrl: '...', timestamp: ... }
  }
];

export const bulkCharacterMap = Array.from({ length: 100 }, (_, i) => ({
  id: `img_bulk_${i + 1}`,
  situation: `${i + 1}`, // 기본 태그를 숫자로 지정, 사용자가 앱에서 변경 가능
  url: `https://rinw.uk/NAS/CUL/${i + 1}.webp`
}));

export const bulkCharacter = {
  id: 'char_100',
  name: '100장 커스텀 캐릭터',
  avatar: 'https://rinw.uk/NAS/CUL/1.webp',
  model: 'gemini-2.5-flash',
  systemPrompt: `이 캐릭터는 100장의 이미지가 연동되어 있습니다. 상황에 맞게 대화하세요.\n\n[스토리텔링 및 묘사 지시]\n대화 형태뿐만 아니라 구체적인 상황 묘사와 행동 묘사를 소설처럼 디테일하게 서술해.`,
  greeting: "100장 이미지 캐릭터 세팅 완료!",
  imageMap: bulkCharacterMap,
  messages: []
};

export const loadCharacters = () => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) {
    const initialChars = [...defaultCharacters, bulkCharacter];
    saveCharacters(initialChars);
    return initialChars;
  }

  const parsed = JSON.parse(data);
  // 기존 유저의 로컬 스토리지 데이터에 char_100이 없다면 자동 추가
  if (!parsed.find(c => c.id === 'char_100')) {
    parsed.push(bulkCharacter);
    saveCharacters(parsed);
  }
  return parsed;
};

export const saveCharacters = (characters) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(characters));
};

export const parseSituationFromText = (text, character) => {
  // text 예시: "[부끄러움] 아, 뭐라는거야 진짜..." 또는 줄바꿈 후 "[기쁨]" 등
  // ^ 제거하여 텍스트 중간이나 앞에 공백이 있어도 첫 번째 대괄호 태그를 찾도록 완화
  const match = text.match(/\[(.*?)\]/);
  let situationUrl = null;
  let cleanText = text;

  if (match) {
    const situation = match[1];
    cleanText = text.replace(/\[.*?\]\s*/, '').trim(); // 첫 번째 태그만 제거하고 공백 정리

    // imageMap에서 일치하는 상황 찾기
    const foundImage = character.imageMap.find(img => img.situation === situation);
    if (foundImage) {
      situationUrl = foundImage.url;
    } else {
      // 매칭되는 이미지가 없으면 기본 아바타 (또는 '평온' 이미지)
      const defaultImg = character.imageMap.find(img => img.situation === '평온');
      situationUrl = defaultImg ? defaultImg.url : character.avatar;
    }
  }

  return { cleanText, situationUrl };
};
