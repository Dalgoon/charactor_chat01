import React, { useState, useEffect, useRef } from 'react';
import {
  loadCharacters,
  saveCharacters,
  loadPersonas,
  savePersonas,
  parseSituationFromText,
  LOCAL_STORAGE_KEY
} from './utils/db';
import { initGeminiAPI, generateChatResponse } from './utils/api';
import {
  FiSettings,
  FiSend,
  FiPlus,
  FiTrash2,
  FiX,
  FiKey,
  FiImage,
  FiMenu,
  FiCopy,
  FiArrowUp,
  FiArrowDown
} from 'react-icons/fi';
import defaultMiaPrompt from '../[미아그린]시스템프롬프트.txt?raw';

function App() {
  const [characters, setCharacters] = useState([]);
  const [activeCharId, setActiveCharId] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');

  // App Phase: 'select_persona' | 'chat'
  const [appPhase, setAppPhase] = useState('select_persona');

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isPersonaSettingsOpen, setIsPersonaSettingsOpen] = useState(false);

  // User Personas state
  const [personas, setPersonas] = useState([]);
  const [activePersonaId, setActivePersonaId] = useState(null);
  const [editingPersona, setEditingPersona] = useState(null);

  // Edit/Create Character State
  const [editingChar, setEditingChar] = useState(null);

  const messagesEndRef = useRef(null);
  const messageListRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Load initial data
    const savedChars = loadCharacters();
    setCharacters(savedChars);
    if (savedChars.length > 0) {
      setActiveCharId(savedChars[0].id);
    }

    const savedPersonas = loadPersonas();
    setPersonas(savedPersonas);
    if (savedPersonas.length > 0) {
      setActivePersonaId(savedPersonas[0].id);
    }

    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKey(savedKey);
    else setIsApiKeyOpen(true);
  }, []);

  const activeChar = characters.find(c => c.id === activeCharId) || null;
  const activePersona = personas.find(p => p.id === activePersonaId) || null;

  useEffect(() => {
    scrollToBottom();
  }, [activeChar?.messages, isLoading]);

  useEffect(() => {
    if (appPhase === 'chat') {
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    }
  }, [appPhase]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const scrollToTop = () => {
    messageListRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSaveApiKey = (key) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    setIsApiKeyOpen(false);
  };

  const handleInsertActionAsterisks = (e) => {
    // Prevent the button click from stealing focus away from the input (Crucial for iOS)
    if (e) e.preventDefault();

    const input = inputRef.current;
    if (!input) return;

    const startPos = input.selectionStart || inputMessage.length;
    const endPos = input.selectionEnd || inputMessage.length;

    const textBefore = inputMessage.substring(0, startPos);
    const textAfter = inputMessage.substring(endPos, inputMessage.length);

    setInputMessage(textBefore + '**' + textAfter);

    // Set cursor position between the asterisks after React state flush
    setTimeout(() => {
      if (input) {
        input.focus();
        input.setSelectionRange(startPos + 1, startPos + 1);
      }
    }, 10);
  };

  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleInputKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (isMobile) {
        // 모바일: Enter 키는 기본 줄바꿈 허용 (전송 안 함)
        return;
      }
      // 데스크탑: Shift 안 누른 Enter는 전송, 누른 Enter는 줄바꿈 허용
      if (!e.shiftKey) {
        e.preventDefault();
        handleSendMessage(e);
      }
    }
  };

  const handleInputText = (e) => {
    setInputMessage(e.target.value);
    // 높이 자동 조절
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || !activeChar || isLoading) return;
    if (!apiKey) {
      alert("API Key is required.");
      setIsApiKeyOpen(true);
      return;
    }

    const newMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: inputMessage,
      timestamp: Date.now()
    };

    // Optimistic UI update
    const updatedChars = characters.map(char => {
      if (char.id === activeCharId) {
        return { ...char, messages: [...char.messages, newMessage] };
      }
      return char;
    });

    setCharacters(updatedChars);
    saveCharacters(updatedChars);
    setInputMessage('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto'; // 입력란 높이 초기화
    }
    setIsLoading(true);

    try {
      const ai = initGeminiAPI(apiKey);

      // Get the character instance we just updated
      const currentChar = updatedChars.find(c => c.id === activeCharId);

      // 1. Fetch AI response
      const rawResponse = await generateChatResponse(
        ai,
        currentChar,
        currentChar.messages.slice(0, -1), // Everything except the message we just added
        newMessage.text, // The current message
        activePersona // Pass the active user persona
      );

      // 2. Parse Contextual Tags (e.g. [기쁨] 안녕!)
      // If parsing fails or doesn't find a tag, situationUrls will fall back to default avatar if any tags were present
      const { cleanText, situationUrls, situationUrl } = parseSituationFromText(rawResponse, currentChar);

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: cleanText,
        rawText: rawResponse, // Store for debugging if needed
        situationUrl: situationUrl, // Fallback for existing messages
        situationUrls: situationUrls, // Array of URLs
        timestamp: Date.now()
      };

      // 3. Save AI response to state
      setCharacters(prevChars => {
        const newChars = prevChars.map(char => {
          if (char.id === activeCharId) {
            return { ...char, messages: [...char.messages, aiMessage] };
          }
          return char;
        });
        saveCharacters(newChars);
        return newChars;
      });

    } catch (error) {
      alert("API Error: " + error.message);
      // Rollback user message on error (optional)
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessageText = (text) => {
    if (!text) return '';
    const parts = text.split('*');
    if (parts.length === 1) return text;

    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <span key={index} className="action-text">*{part}*</span>;
      }
      return part;
    });
  };

  // Character Management
  const handleAddNewCharacter = () => {
    setEditingChar({
      id: 'new_' + Date.now(),
      name: '미아 그린',
      avatar: 'https://i.imgur.com/your-avatar.jpg',
      model: 'gemini-2.5-flash',
      systemPrompt: defaultMiaPrompt,
      greeting: '안녕?',
      maxImages: 1, // Default limit
      imageMap: [{ id: 'img_' + Date.now(), situation: '평온', url: '' }],
      messages: []
    });
    setIsSettingsOpen(true);
  };

  const handleEditCharacter = (char) => {
    setEditingChar({ ...char });
    setIsSettingsOpen(true);
  };

  const handleDeleteCharacter = (id) => {
    if (window.confirm("정말 이 캐릭터를 삭제하시겠습니까? (대화 내용 모두 삭제)")) {
      const newChars = characters.filter(c => c.id !== id);
      setCharacters(newChars);
      saveCharacters(newChars);
      if (activeCharId === id) {
        setActiveCharId(newChars.length > 0 ? newChars[0].id : null);
      }
    }
  };

  const handleDeleteCharacterFromSidebar = (e, id) => {
    e.stopPropagation();
    handleDeleteCharacter(id);
  };

  const handleCopyMessage = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      // alert('메시지가 복사되었습니다.');
    }).catch(err => {
      console.error('Failed to copy: ', err);
    });
  };

  const handleDeleteMessage = (messageId) => {
    if (window.confirm("이 메시지를 삭제하시겠습니까?")) {
      const updatedChars = characters.map(char => {
        if (char.id === activeCharId) {
          return { ...char, messages: char.messages.filter(m => m.id !== messageId) };
        }
        return char;
      });
      setCharacters(updatedChars);
      saveCharacters(updatedChars);
    }
  };

  const saveEditedCharacter = () => {
    if (!editingChar.name) return alert("이름을 입력해주세요.");

    let newChars;
    const isNew = editingChar.id.startsWith('new_');

    if (isNew) {
      // Append initial greeting message
      const charToSave = {
        ...editingChar,
        id: 'char_' + Date.now(),
        messages: [{
          id: Date.now().toString(),
          role: 'model',
          text: editingChar.greeting,
          timestamp: Date.now(),
          situationUrl: editingChar.avatar // Default avatar for greeting
        }]
      };
      newChars = [...characters, charToSave];
      setActiveCharId(charToSave.id);
    } else {
      newChars = characters.map(c => c.id === editingChar.id ? editingChar : c);
    }

    setCharacters(newChars);
    saveCharacters(newChars);
    setIsSettingsOpen(false);
    setEditingChar(null);
  };

  // Persona Management Handlers
  const handleAddNewPersona = () => {
    setEditingPersona({
      id: 'user_' + Date.now(),
      name: '새 주인공',
      personaPrompt: ''
    });
    setIsPersonaSettingsOpen(true);
  };

  const handleEditPersona = (persona) => {
    setEditingPersona({ ...persona });
    setIsPersonaSettingsOpen(true);
  };

  const handleDeletePersona = (id) => {
    if (personas.length <= 1) {
      return alert("최소 1개의 프로필은 유지해야 합니다.");
    }
    if (window.confirm("이 주인공 프로필을 삭제하시겠습니까?")) {
      const newPersonas = personas.filter(p => p.id !== id);
      setPersonas(newPersonas);
      savePersonas(newPersonas);
      if (activePersonaId === id) {
        setActivePersonaId(newPersonas[0].id);
      }
    }
  };

  const saveEditedPersona = () => {
    if (!editingPersona.name) return alert("주인공 이름을 입력해주세요.");

    let newPersonas;
    const isNew = editingPersona.id.startsWith('user_') && !personas.find(p => p.id === editingPersona.id);

    if (isNew) {
      newPersonas = [...personas, editingPersona];
      setActivePersonaId(editingPersona.id);
    } else {
      newPersonas = personas.map(p => p.id === editingPersona.id ? editingPersona : p);
    }

    setPersonas(newPersonas);
    savePersonas(newPersonas);
    setIsPersonaSettingsOpen(false);
    setEditingPersona(null);
  };

  // Image Map Handlers
  const addImageMapRow = () => {
    setEditingChar({
      ...editingChar,
      imageMap: [...(editingChar.imageMap || []), { id: 'img_' + Date.now(), situation: '', url: '' }]
    });
  };

  const updateImageMapRow = (id, field, value) => {
    setEditingChar({
      ...editingChar,
      imageMap: editingChar.imageMap.map(img => img.id === id ? { ...img, [field]: value } : img)
    });
  };

  const removeImageMapRow = (id) => {
    setEditingChar({
      ...editingChar,
      imageMap: editingChar.imageMap.filter(img => img.id !== id)
    });
  };

  if (appPhase === 'select_persona') {
    return (
      <div className="persona-home-screen">
        <div className="persona-home-header">
          <h1>누구로 플레이하시겠습니까?</h1>
          <p>이 기기에서 사용할 주인공(내 페르소나) 하나를 선택하세요.</p>
        </div>

        <div className="persona-card-grid">
          {personas.map(p => (
            <div
              key={p.id}
              className={`persona-card ${activePersonaId === p.id ? 'active' : ''}`}
              onClick={() => setActivePersonaId(p.id)}
            >
              <div className="persona-card-name" style={{ marginTop: '10px' }}>{p.name}</div>
              <button
                className="persona-card-settings-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  handleEditPersona(p);
                }}
                title="프로필 수정"
              >
                <FiSettings />
              </button>
            </div>
          ))}
          <div className="persona-card add-new" onClick={handleAddNewPersona}>
            <div className="add-icon"><FiPlus /></div>
            <div className="persona-card-name">새 주인공 생성</div>
          </div>
        </div>

        <div className="persona-home-footer">
          <button
            className="btn-primary start-chat-btn"
            onClick={() => setAppPhase('chat')}
            disabled={!activePersonaId}
          >
            선택한 주인공으로 시작하기
          </button>
        </div>

        {/* User Persona Settings Modal can still open here */}
        {isPersonaSettingsOpen && editingPersona && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">{editingPersona.id.startsWith('user_') && !personas.find(p => p.id === editingPersona.id) ? '새 주인공 만들기' : '내 주인공(페르소나) 설정'}</h2>
                <button className="close-btn" onClick={() => setIsPersonaSettingsOpen(false)}><FiX /></button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">이름</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingPersona.name}
                    onChange={(e) => setEditingPersona({ ...editingPersona, name: e.target.value })}
                    placeholder="예: 건방진 학생"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">주인공 성격 및 배경 설정 (프롬프트 주입)</label>
                  <textarea
                    className="form-textarea"
                    value={editingPersona.personaPrompt}
                    onChange={(e) => setEditingPersona({ ...editingPersona, personaPrompt: e.target.value })}
                    placeholder="AI에게 인식될 내 설정입니다. 예: 매사에 건방지고 도발적이다."
                    style={{ height: '150px' }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                {(!editingPersona.id.startsWith('user_') || personas.find(p => p.id === editingPersona.id)) ? (
                  <button className="btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleDeletePersona(editingPersona.id)}>
                    프로필 삭제
                  </button>
                ) : <div></div>}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn-secondary" onClick={() => setIsPersonaSettingsOpen(false)}>취소</button>
                  <button className="btn-primary" onClick={saveEditedPersona}>저장하기</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-title">My AI Characters</div>
          <button className="add-character-btn" onClick={handleAddNewCharacter} title="새 캐릭터 추가">
            <FiPlus />
          </button>
        </div>

        <div className="character-list">
          {characters.map(char => (
            <div
              key={char.id}
              className={`character-item ${activeCharId === char.id ? 'active' : ''}`}
              onClick={() => {
                setActiveCharId(char.id);
                setIsSidebarOpen(false); // Close sidebar on mobile when a character is selected
              }}
            >
              <img src={char.avatar || 'https://via.placeholder.com/48'} alt={char.name} className="character-avatar" />
              <div className="character-info">
                <div className="character-name">{char.name}</div>
                <div className="character-preview">
                  {char.messages && char.messages.length > 0
                    ? char.messages[char.messages.length - 1].text
                    : char.greeting}
                </div>
              </div>
              <button
                className="sidebar-delete-btn"
                onClick={(e) => handleDeleteCharacterFromSidebar(e, char.id)}
                title="캐릭터 삭제"
              >
                <FiTrash2 />
              </button>
            </div>
          ))}
          {characters.length === 0 && (
            <div style={{ padding: '20px', color: 'var(--text-muted)', textAlign: 'center' }}>
              캐릭터가 없습니다. + 버튼을 눌러 추가하세요.
            </div>
          )}
        </div>

        <div style={{ padding: '15px', borderTop: '1px solid var(--border-color)' }}>
          <button
            className="btn-secondary"
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
            onClick={() => setIsApiKeyOpen(true)}
          >
            <FiKey /> API Key Setup
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      {activeChar ? (
        <main className="chat-area">
          <header className="chat-header">
            <div className="chat-header-info">
              <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
                <FiMenu />
              </button>
              <img src={activeChar.avatar} alt={activeChar.name} className="chat-header-avatar" />
              <div className="chat-header-name">{activeChar.name}</div>
            </div>
            <button className="settings-btn" onClick={() => handleEditCharacter(activeChar)} title="캐릭터 설정">
              <FiSettings />
            </button>
          </header>

          <div className="message-list" ref={messageListRef}>
            {activeChar.messages.map(msg => (
              <div key={msg.id} className={`message-wrapper ${msg.role === 'user' ? 'user' : 'ai'}`}>
                {msg.role === 'model' && (
                  <img
                    src={activeChar.avatar}
                    alt="avatar"
                    className="message-avatar"
                    style={{ visibility: (msg.situationUrl || (msg.situationUrls && msg.situationUrls.length > 0)) ? 'hidden' : 'visible' }}
                  />
                )}

                <div className="message-content">
                  {/* Contextual Image (If exists and is AI) */}
                  {/* For backward compatibility with older string url (if situationUrls doesn't exist) */}
                  {msg.role === 'model' && !msg.situationUrls && msg.situationUrl && msg.situationUrl !== activeChar.avatar && (
                    <div className="message-image-container">
                      <img src={msg.situationUrl} alt="situation" className="message-image" />
                    </div>
                  )}
                  {/* For new array of urls */}
                  {msg.role === 'model' && Array.isArray(msg.situationUrls) && msg.situationUrls.filter(url => url !== activeChar.avatar).map((url, idx) => (
                    <div key={idx} className="message-image-container">
                      <img src={url} alt={`situation-${idx}`} className="message-image" />
                    </div>
                  ))}

                  <div className="message-bubble" style={{ position: 'relative' }}>
                    {renderMessageText(msg.text)}
                  </div>
                  <div className="message-actions">
                    <button
                      className="msg-action-btn"
                      onClick={() => handleCopyMessage(msg.rawText || msg.text)}
                      title="메시지 복사"
                    >
                      <FiCopy />
                    </button>
                    <button
                      className="msg-action-btn"
                      onClick={() => handleDeleteMessage(msg.id)}
                      title="메시지 삭제"
                    >
                      <FiTrash2 />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="message-wrapper ai">
                <img src={activeChar.avatar} alt="avatar" className="message-avatar" />
                <div className="message-bubble" style={{ color: 'var(--text-muted)' }}>
                  입력 중...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="scroll-remote">
            <button className="scroll-btn" onClick={scrollToTop} title="맨 위로 가기">
              <FiArrowUp />
            </button>
            <button className="scroll-btn" onClick={scrollToBottom} title="최신 대화로 가기">
              <FiArrowDown />
            </button>
          </div>

          <form className="input-area" onSubmit={handleSendMessage}>
            <div className="input-container">
              <textarea
                className="message-input"
                placeholder="메시지를 입력하세요..."
                value={inputMessage}
                onChange={handleInputText}
                onKeyDown={handleInputKeyDown}
                disabled={isLoading}
                ref={inputRef}
                rows={1}
              />
              <button
                type="button"
                className="action-insert-btn"
                onPointerDown={handleInsertActionAsterisks} // Use pointerDown to catch it before focus blurs
                onClick={(e) => e.preventDefault()} // Fallback
                title="행동 묘사 추가 (*)"
                disabled={isLoading}
              >
                [*]
              </button>
              <button type="submit" className="send-btn" disabled={isLoading || !inputMessage.trim()}>
                <FiSend />
              </button>
            </div>
          </form>
        </main>
      ) : (
        <main className="chat-area" style={{ justifyContent: 'center', alignItems: 'center' }}>
          <header className="chat-header" style={{ position: 'absolute', top: 0, left: 0, width: '100%' }}>
            <div className="chat-header-info">
              <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
                <FiMenu />
              </button>
            </div>
          </header>
          <div style={{ color: 'var(--text-muted)' }}>왼쪽에서 캐릭터를 선택하거나 새로 생성해주세요.</div>
        </main>
      )
      }

      {/* Character Settings Modal */}
      {
        isSettingsOpen && editingChar && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">{editingChar.id.startsWith('new_') ? '새 캐릭터 만들기' : '캐릭터 설정'}</h2>
                <button className="close-btn" onClick={() => setIsSettingsOpen(false)}><FiX /></button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">이름</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingChar.name}
                    onChange={(e) => setEditingChar({ ...editingChar, name: e.target.value })}
                    placeholder="캐릭터 이름"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">기본 프로필 아이콘 (URL)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingChar.avatar}
                    onChange={(e) => setEditingChar({ ...editingChar, avatar: e.target.value })}
                    placeholder="Imgur 등 이미지 링크"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">AI 모델 선택</label>
                  <select
                    className="form-input"
                    value={editingChar.model || 'gemini-2.5-flash'}
                    onChange={(e) => setEditingChar({ ...editingChar, model: e.target.value })}
                    style={{ backgroundColor: 'var(--bg-dark)' }}
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (기본/빠름/저렴)</option>
                    <option value="gemini-2.5-pro">Gemini 2.5 Pro (고성능/긴 글/유료 전환시 주의)</option>
                  </select>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Pro 모델은 추론 능력이 뛰어나고 더 긴 글을 작성하지만, 무료 한도를 초과하면 과금될 수 있습니다.</p>
                </div>

                <div className="form-group">
                  <label className="form-label">첫 인사말 (줄바꿈 가능)</label>
                  <textarea
                    className="form-textarea"
                    value={editingChar.greeting}
                    onChange={(e) => setEditingChar({ ...editingChar, greeting: e.target.value })}
                    style={{ height: '80px' }}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">성격 및 배경 설정 (시스템 프롬프트)</label>
                  <textarea
                    className="form-textarea"
                    value={editingChar.systemPrompt}
                    onChange={(e) => setEditingChar({ ...editingChar, systemPrompt: e.target.value })}
                    placeholder="예: 너는 츤데레 10년지기 소꿉친구야..."
                    style={{ height: '150px' }}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label">기본 출력 이미지 장수 (필수) 🖼️</label>
                  <div style={{ display: 'flex', gap: '16px', marginTop: '8px' }}>
                    {[1, 2, 3].map(num => (
                      <label key={num} style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer' }}>
                        <input
                          type="radio"
                          name="maxImages"
                          value={num}
                          checked={(editingChar.maxImages || 1) == num}
                          onChange={(e) => setEditingChar({ ...editingChar, maxImages: parseInt(e.target.value) })}
                          style={{ accentColor: 'var(--primary-color)', width: '16px', height: '16px' }}
                        />
                        <span>{num}장</span>
                      </label>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '8px' }}>AI가 답변당 반드시 출력하게 될 이미지 개수를 지정합니다.</p>
                </div>

                <div className="form-group" style={{
                  backgroundColor: 'rgba(99, 102, 241, 0.05)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(99, 102, 241, 0.2)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <label className="form-label" style={{ color: 'var(--primary-color)' }}>
                      <FiImage style={{ marginRight: '5px' }} />상황별 이미지 링크 설정
                    </label>
                    <button className="image-map-btn" onClick={addImageMapRow}>+ 추가</button>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: '1.4' }}>
                    입력한 '상황(예: 기쁨, 화남)'을 AI가 텍스트 맨 앞에 [기쁨] 과 같이 삽입하면, 매핑된 이미지가 채팅창에 큰 화면으로 출력됩니다. Imgur 링크 리스트를 구성하세요.
                  </p>

                  <div className="image-map-list">
                    {editingChar.imageMap?.map((img) => (
                      <div key={img.id} className="image-map-item">
                        <input
                          type="text"
                          className="form-input"
                          placeholder="상황 (예: 기쁨)"
                          style={{ width: '100px' }}
                          value={img.situation}
                          onChange={(e) => updateImageMapRow(img.id, 'situation', e.target.value)}
                        />
                        <input
                          type="text"
                          className="form-input"
                          placeholder="이미지 URL (예: https://imgur...)"
                          style={{ flex: 1 }}
                          value={img.url}
                          onChange={(e) => updateImageMapRow(img.id, 'url', e.target.value)}
                        />
                        {img.url ? (
                          <img src={img.url} alt="preview" className="image-preview-mini" onError={(e) => e.target.style.display = 'none'} />
                        ) : (
                          <div className="image-preview-mini"></div>
                        )}
                        <button className="remove-map-btn" onClick={() => removeImageMapRow(img.id)}><FiTrash2 /></button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                {!editingChar.id.startsWith('new_') ? (
                  <button className="btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleDeleteCharacter(editingChar.id)}>
                    캐릭터 삭제
                  </button>
                ) : <div></div>}
                <div className="form-group">
                  <label className="form-label">이 캐릭터와 대화할 내 페르소나 (주인공)</label>
                  <select
                    value={activePersonaId || ''}
                    onChange={(e) => setActivePersonaId(e.target.value)}
                    className="form-input"
                  >
                    {personas.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    이 대화방에서 내가 어떤 주인공으로 롤플레잉할지 설정합니다.
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px', marginTop: '10px' }}>
                  <button className="btn-secondary" onClick={() => setIsSettingsOpen(false)}>취소</button>
                  <button className="btn-primary" onClick={saveEditedCharacter}>
                    {editingChar.id.startsWith('new_') ? '설정 저장 후 대화 시작' : '저장하기'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* User Persona Settings Modal - Kept here so it can be opened from Sidebar if needed later, but primarily opened from Main Screen now */}
      {
        isPersonaSettingsOpen && editingPersona && (
          <div className="modal-overlay">
            <div className="modal-content">
              <div className="modal-header">
                <h2 className="modal-title">{editingPersona.id.startsWith('user_') && !personas.find(p => p.id === editingPersona.id) ? '새 주인공 만들기' : '내 주인공(페르소나) 설정'}</h2>
                <button className="close-btn" onClick={() => setIsPersonaSettingsOpen(false)}><FiX /></button>
              </div>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">이름</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingPersona.name}
                    onChange={(e) => setEditingPersona({ ...editingPersona, name: e.target.value })}
                    placeholder="예: 건방진 학생"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">아이콘 (URL)</label>
                  <input
                    type="text"
                    className="form-input"
                    value={editingPersona.avatar}
                    onChange={(e) => setEditingPersona({ ...editingPersona, avatar: e.target.value })}
                    placeholder="아이콘 이미지 링크"
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">주인공 성격 및 배경 설정 (프롬프트 주입)</label>
                  <textarea
                    className="form-textarea"
                    value={editingPersona.personaPrompt}
                    onChange={(e) => setEditingPersona({ ...editingPersona, personaPrompt: e.target.value })}
                    placeholder="AI에게 인식될 내 설정입니다. 예: 매사에 건방지고 도발적이다."
                    style={{ height: '150px' }}
                  />
                </div>
              </div>
              <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
                {(!editingPersona.id.startsWith('user_') || personas.find(p => p.id === editingPersona.id)) ? (
                  <button className="btn-secondary" style={{ color: '#ef4444', borderColor: '#ef4444' }} onClick={() => handleDeletePersona(editingPersona.id)}>
                    프로필 삭제
                  </button>
                ) : <div></div>}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button className="btn-secondary" onClick={() => setIsPersonaSettingsOpen(false)}>취소</button>
                  <button className="btn-primary" onClick={saveEditedPersona}>저장하기</button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* API Key Modal */}
      {
        isApiKeyOpen && (
          <div className="modal-overlay">
            <div className="modal-content" style={{ maxWidth: '500px' }}>
              <div className="modal-header">
                <h2 className="modal-title">Gemini API Key 설정</h2>
              </div>
              <div className="modal-body">
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '10px' }}>
                  이 앱은 Google AI Studio (개발자 모드) API를 사용합니다.
                  aistudio.google.com 에서 발급받은 키를 입력해주세요. <br />
                  (주의: 키는 브라우저 내부(localStorage)에만 안전하게 저장됩니다.)
                </p>
                <div className="form-group">
                  <input
                    type="password"
                    className="form-input"
                    placeholder="AIza..."
                    defaultValue={apiKey}
                    id="api-key-input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                {apiKey && <button className="btn-secondary" onClick={() => setIsApiKeyOpen(false)}>닫기</button>}
                <button
                  className="btn-primary"
                  onClick={() => handleSaveApiKey(document.getElementById('api-key-input').value)}
                >
                  저장
                </button>
              </div>
            </div>
          </div>
        )
      }

    </div >
  );
}

export default App;
