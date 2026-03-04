import React, { useState, useEffect, useRef } from 'react';
import {
  loadCharacters,
  saveCharacters,
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
  FiMenu
} from 'react-icons/fi';

function App() {
  const [characters, setCharacters] = useState([]);
  const [activeCharId, setActiveCharId] = useState(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [apiKey, setApiKey] = useState('');

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isApiKeyOpen, setIsApiKeyOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Edit/Create Character State
  const [editingChar, setEditingChar] = useState(null);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    // Load initial data
    const savedChars = loadCharacters();
    setCharacters(savedChars);
    if (savedChars.length > 0) {
      setActiveCharId(savedChars[0].id);
    }

    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKey(savedKey);
    else setIsApiKeyOpen(true);
  }, []);

  const activeChar = characters.find(c => c.id === activeCharId) || null;

  useEffect(() => {
    scrollToBottom();
  }, [activeChar?.messages, isLoading]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const handleSaveApiKey = (key) => {
    localStorage.setItem('gemini_api_key', key);
    setApiKey(key);
    setIsApiKeyOpen(false);
  };

  const handleInsertActionAsterisks = () => {
    const input = inputRef.current;
    if (!input) return;

    const startPos = input.selectionStart || inputMessage.length;
    const endPos = input.selectionEnd || inputMessage.length;

    const textBefore = inputMessage.substring(0, startPos);
    const textAfter = inputMessage.substring(endPos, inputMessage.length);

    setInputMessage(textBefore + '**' + textAfter);

    // Set cursor position between the asterisks
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(startPos + 1, startPos + 1);
    }, 0);
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
    setIsLoading(true);

    try {
      const ai = initGeminiAPI(apiKey);

      // Get the character instance we just updated
      const currentChar = updatedChars.find(c => c.id === activeCharId);

      // 1. Fetch AI response
      const rawResponse = await generateChatResponse(
        ai,
        currentChar,
        currentChar.messages.slice(0, -1), // Everything except the message we just added (wait, actually SDK needs history BEFORE the current message)
        newMessage.text // The current message
      );

      // 2. Parse Contextual Tags (e.g. [기쁨] 안녕!)
      // If parsing fails or doesn't find a tag, situationUrl will fall back to default avatar
      const { cleanText, situationUrl } = parseSituationFromText(rawResponse, currentChar);

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        text: cleanText,
        rawText: rawResponse, // Store for debugging if needed
        situationUrl: situationUrl,
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
      name: '',
      avatar: 'https://i.imgur.com/your-avatar.jpg',
      model: 'gemini-2.5-flash',
      systemPrompt: '',
      greeting: '안녕?',
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

          <div className="message-list">
            {activeChar.messages.map(msg => (
              <div key={msg.id} className={`message-wrapper ${msg.role === 'user' ? 'user' : 'ai'}`}>
                {msg.role === 'model' && (
                  <img
                    src={activeChar.avatar}
                    alt="avatar"
                    className="message-avatar"
                    style={{ visibility: msg.situationUrl ? 'hidden' : 'visible' }}
                  />
                )}

                <div className="message-content">
                  {/* Contextual Image (If exists and is AI) */}
                  {msg.role === 'model' && msg.situationUrl && msg.situationUrl !== activeChar.avatar && (
                    <div className="message-image-container">
                      <img src={msg.situationUrl} alt="situation" className="message-image" />
                    </div>
                  )}

                  <div className="message-bubble" style={{ position: 'relative' }}>
                    {renderMessageText(msg.text)}
                  </div>
                  <button
                    className="msg-delete-btn"
                    onClick={() => handleDeleteMessage(msg.id)}
                    title="메시지 삭제"
                  >
                    <FiTrash2 />
                  </button>
                </div>

                {msg.role === 'user' && (
                  <div className="message-avatar" style={{ backgroundColor: 'var(--primary-color)' }}></div>
                )}
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

          <form className="input-area" onSubmit={handleSendMessage}>
            <div className="input-container">
              <input
                type="text"
                className="message-input"
                placeholder="메시지를 입력하세요..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                disabled={isLoading}
                ref={inputRef}
              />
              <button
                type="button"
                className="action-insert-btn"
                onClick={handleInsertActionAsterisks}
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
      )}

      {/* Character Settings Modal */}
      {isSettingsOpen && editingChar && (
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
              <div style={{ display: 'flex', gap: '12px' }}>
                <button className="btn-secondary" onClick={() => setIsSettingsOpen(false)}>취소</button>
                <button className="btn-primary" onClick={saveEditedCharacter}>
                  {editingChar.id.startsWith('new_') ? '설정 저장 후 대화 시작' : '저장하기'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Key Modal */}
      {isApiKeyOpen && (
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
      )}

    </div>
  );
}

export default App;
