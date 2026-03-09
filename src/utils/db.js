export const LOCAL_STORAGE_KEY = 'ai_characters_db';
export const PERSONAS_STORAGE_KEY = 'user_personas_db';

import defaultMiaPrompt from '../../[미아그린]/[미아그린]시스템프롬프트.txt?raw';
import defaultMiaPrologue from '../../[미아그린]/미아그린 프롤로그.txt?raw';

import defaultPengkoPrompt from '../../[펭코]/펭코 시스템 프롬프트.txt?raw';
import defaultPengkoPrologue from '../../[펭코]/펭코 프롤로그.txt?raw';
import pengkoTagsData from '../../[펭코]/펭코, 이미지 태그 및 url.txt?raw';

export const defaultPersonas = [
  {
    id: 'user_default_1',
    name: '익명',
    personaPrompt: '나는 평범한 학생이다.'
  },
  {
    id: 'user_default_2',
    name: '건방진 녀석',
    personaPrompt: '상대방을 무시하고 깔보는 성격이다.'
  },
  {
    id: 'user_default_3',
    name: '선생님',
    personaPrompt: `나는 이 학교에 갓 부임한 초보 교사다.
어딘가 어설프고, 담당 학급의 불량 학생들에게 기가 눌리곤 한다.
학생들을 바른 길로 이끌고 싶어하지만 마음대로 되지 않는다.`
  }
];

export const defaultCharacters = [
  {
    id: 'char_1',
    name: '진아',
    avatar: 'https://i.imgur.com/WbQnbqs.jpeg',
    model: 'gemini-2.5-flash', // Default model
    maxImages: 1,
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

const miaGreenTagsData = `
1:기본/평소/무표정
2:미소
3:웃음
4:걱정/침울
5:눈물
6:서럽게 울음
7:분노하며 눈물
8:기뻐하며 눈물
9:불쾌
10:경멸/혐오
11:당황/놀람
12:당황설렘
13:반함
14:설렘
15:삐침/토라짐/뾰루퉁
16:부정충격
17:짜증
18:화남
19:의문
20:의심
21:겁먹음/공포
22:절망
23:비웃음
24:허그
25:키스
26:임신
27:결혼/웨딩
28:음주/술마실때
29:술에 취함/술에 취했을때
30:수업중(기본/미소/웃음)
31:수업중(경멸/혐오/싫음)
32:엉덩이만지기(기본)
33:엉덩이만지기(경멸/싫음/혐오)
34:엉덩이만지기(흥분/웃음)
35:서빙
36:가슴골노출/가슴으로유혹
37:젖가슴보여주기/젖가슴으로유혹
38:엉덩이로유혹
39:팬티보여주기
40:춤출때
41:봉춤/폴댄스
42:유곡주(앉아서,서서)
43:유곡주(누워서)
44:여성의 가슴만지기(기본)
45:여성의 가슴만지기(기본)
46:여성의 가슴만지기(절정)
47:69자세/상호구강성교(기본)
48:69자세/상호구강성교(절정)
49:겨드랑이 핥기/빨기(기본)
50:겨드랑이 핥기/빨기(절정)
51:교배프레스(기본)
52:교배프레스(절정)
53:기승위(기본)
54:기승위(기본)
55:기승위(절정)
56:기승위(절정)
57:대딸/핸드잡(기본)
58:대딸+펠라치오(기본)
59:대딸+펠라치오(사정)
60:펠라치오/구강성교(기본)
61:펠라치오/구강성교(기본)
62:펠라치오/구강성교(사정)
63:딥 스로트(기본)
64:딥 스로트(사정)
65:대면좌위(기본)
66:대면좌위(절정)
67:들박(기본)
68:들박(절정)
69:역기승위(기본)
70:역기승위(절정)
71:커널링구스(기본)
72:커널링구스(절정)
73:수유대딸
74:스팽킹
75:아마존(기본)
76:아마존(절정)
77:정상위(기본)
78:정상위(절정)
79:측위(기본)
80:측위(절정)
81:파이즈리(기본)
82:파이즈리(사정)
83:풀넬슨(기본)
84:풀넬슨(절정)
85:풋잡
86:핑거링(기본)
87:핑거링(절정)
88:후배위(기본)
89:후배위(기본)
90:후배위(절정)
91:후배위(절정)
92:보지벌리기
93:오망꼬댄스
94:남성의 젖꼭지빨거나핥으며 대딸
95:여성의 젖꼭지빨기/핥기(기본)
96:여성의 젖꼭지빨기/핥기(절정)
97:필로우토크(기본)
98:필로우토크(미소/웃음)
99:필로우토크(유혹)
100:필로우토크(혐오/싫음/경멸)
`;

export const bulkCharacterMap = miaGreenTagsData.trim().split('\n').map(line => {
  const ObjectParts = line.split(':');
  const num = ObjectParts[0].replace(/[^0-9]/g, ''); // Extract number
  const tag = ObjectParts[1].replace(/\.$/, ''); // Remove trailing dot if any
  return {
    id: `img_bulk_${num}`,
    situation: tag,
    url: `https://rinw.uk/NAS/CUL/${num}.webp`
  };
});

export const bulkCharacter = {
  id: 'char_miagreen',
  name: '미아그린',
  avatar: 'https://rinw.uk/NAS/CUL/1.webp',
  model: 'gemini-2.5-flash',
  maxImages: 1,
  systemPrompt: defaultMiaPrompt,
  greeting: defaultMiaPrologue,
  imageMap: bulkCharacterMap,
  messages: [
    {
      id: "prologue_msg_1",
      role: 'model',
      text: defaultMiaPrologue,
      timestamp: Date.now(),
      situationUrl: 'https://rinw.uk/NAS/CUL/10.webp' // 10번: 경멸/혐오 이미지 태그에 맞춤
    }
  ]
};

export const pengkoCharacterMap = pengkoTagsData.trim().split('\n').map((line, index) => {
  const lineStr = line.trim();
  if (!lineStr) return null;
  const match = lineStr.match(/^(https?:\/\/\S+)\s+\[(.*?)\]$/);
  if (match) {
    return {
      id: `img_pengko_${index}`,
      situation: match[2],
      url: match[1]
    };
  }
  return null;
}).filter(Boolean);

export const pengkoCharacter = {
  id: 'char_pengko',
  name: '펭코',
  avatar: 'https://i.imgur.com/5MszrLO.png',
  model: 'gemini-2.5-flash',
  maxImages: 1,
  systemPrompt: defaultPengkoPrompt,
  greeting: defaultPengkoPrologue,
  imageMap: pengkoCharacterMap,
  messages: [
    {
      id: "prologue_msg_pengko_1",
      role: 'model',
      text: defaultPengkoPrologue,
      timestamp: Date.now(),
      situationUrl: 'https://i.imgur.com/IgJs6tX.png'
    }
  ]
};

export const loadCharacters = () => {
  const data = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!data) {
    const initialChars = [...defaultCharacters, bulkCharacter, pengkoCharacter];
    saveCharacters(initialChars);
    return initialChars;
  }

  const parsed = JSON.parse(data);
  let changed = false;

  // 기존 유저의 로컬 스토리지 데이터에 미아그린이 없다면 자동 추가
  const mia = parsed.find(c => c.id === 'char_miagreen');
  if (!mia) {
    parsed.push(bulkCharacter);
    changed = true;
  } else {
    // 미아그린의 시스템 프롬프트를 텍스트 파일의 내용으로 강제 고정
    mia.systemPrompt = defaultMiaPrompt;
    mia.greeting = defaultMiaPrologue;
    mia.imageMap = bulkCharacterMap;
    if (mia.messages.length > 0 && mia.messages[0].id === "prologue_msg_1") {
      mia.messages[0].text = defaultMiaPrologue;
    }
    changed = true;
  }

  // 기존 유저의 로컬 스토리지 데이터에 펭코가 없다면 자동 추가
  const pengko = parsed.find(c => c.id === 'char_pengko');
  if (!pengko) {
    parsed.push(pengkoCharacter);
    changed = true;
  } else {
    // 펭코의 시스템 프롬프트를 텍스트 파일의 내용으로 강제 고정
    pengko.systemPrompt = defaultPengkoPrompt;
    pengko.greeting = defaultPengkoPrologue;
    pengko.imageMap = pengkoCharacterMap;
    if (pengko.messages.length > 0 && pengko.messages[0].id === "prologue_msg_pengko_1") {
      pengko.messages[0].text = defaultPengkoPrologue;
    }
    changed = true;
  }

  if (changed) {
    saveCharacters(parsed);
  }

  return parsed;
};

export const saveCharacters = (characters) => {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(characters));
};

// Persona Management
export const loadPersonas = () => {
  const data = localStorage.getItem(PERSONAS_STORAGE_KEY);
  if (!data) {
    savePersonas(defaultPersonas);
    return defaultPersonas;
  }
  return JSON.parse(data);
};

export const savePersonas = (personas) => {
  localStorage.setItem(PERSONAS_STORAGE_KEY, JSON.stringify(personas));
};

export const parseSituationFromText = (text, character) => {
  // HTML 태그와 주석 제거 (예: <br>, <b>, <img> 등)
  let strippedText = text.replace(/<!--[\s\S]*?-->/g, '').replace(/<\/?[a-z][a-z0-9]*[^>]*>/ig, '');

  const matches = [...strippedText.matchAll(/\[(.*?)\]/g)];
  let situationUrls = [];
  let cleanText = strippedText;

  console.log(`\n=========================================\n[이미지 파싱 추적 시작]`);
  console.log(`-> 수신된 원본 텍스트:\n`, text);
  console.log(`-> 발견된 [태그] 개수: ${matches.length}개`);

  if (matches.length === 0) {
    console.log(`❌ AI가 텍스트 안에 [상황태그] 형태의 텍스트를 단 하나도 출력하지 않았습니다.`);
    console.log(`=========================================\n`);
  } else {
    matches.forEach(match => {
      const situationTag = match[1].trim();
      console.log(`포착된 태그: [${situationTag}]`);

      // 1. Exact match first
      let foundImage = character.imageMap.find(img => img.situation === situationTag);

      // 2. Fuzzy match if exact match fails
      if (!foundImage) {
        // AI가 출력한 태그를 분할 (예: "활짝 웃음" -> ["활짝", "웃음"])
        const tagKeywords = situationTag.split(/[\s/,]+/).filter(Boolean);

        foundImage = character.imageMap.find(img => {
          // 맵에 등록된 태그 분할 (예: "미소/웃음" -> ["미소", "웃음"])
          const mapKeywords = img.situation.split(/[\s/,]+/).filter(Boolean);

          // 태그 양쪽 키워드 중 하나라도 교집합이 있거나 포함되어 있으면 매칭 간주
          return tagKeywords.some(keyword =>
            mapKeywords.some(mk => mk.includes(keyword) || keyword.includes(mk))
          );
        });

        if (foundImage) {
          console.log(`✅ 유사 태그 매칭 성공: [${situationTag}] -> 맵에 등록된 [${foundImage.situation}]`);
        }
      } else {
        console.log(`✅ 정확히 일치하는 태그 발견: [${situationTag}]`);
      }

      if (foundImage) {
        situationUrls.push(foundImage.url);
        console.log(`   -> 적용된 이미지 주소: ${foundImage.url}`);
      } else {
        const defaultImg = character.imageMap.find(img => img.situation === '평온');
        const defaultUrl = defaultImg ? defaultImg.url : character.avatar;
        situationUrls.push(defaultUrl);
        console.log(`❌ 매칭 실패! 기본 이미지(평온)로 대체됨`);
        console.log(`   -> 적용된 이미지 주소: ${defaultUrl}`);
      }
    });
    console.log(`=========================================\n`);

    // 중복 URL 제거 (선택적)
    situationUrls = [...new Set(situationUrls)];

    // 사용자가 설정한 최대 표시 이미지 개수로 배열 자르기 (기본값 1)
    const MAX_IMAGES = character.maxImages || 1;
    situationUrls = situationUrls.slice(0, MAX_IMAGES);

    // 텍스트에서 모든 상태 태그 삭제
    cleanText = cleanText.replace(/\[.*?\]\s*/g, '').trim();
  }

  // Fallback for older message format compatibility where situationUrl was a single string
  const situationUrl = situationUrls.length > 0 ? situationUrls[0] : null;

  return { cleanText, situationUrls, situationUrl };
};
