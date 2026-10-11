import React, { useState, useEffect, useRef } from 'react';
import { 
  Send, 
  Users, 
  MessageSquare, 
  Radio, 
  X, 
  ChevronDown, 
  Sparkles, 
  ShieldCheck, 
  CheckCheck,
  Minimize2,
  Maximize2,
  User,
  Clock,
  Briefcase
} from 'lucide-react';
import { AppUser, ChatMessage, APP_USERS } from '../types/authAndChat';

interface TeamChatDrawerProps {
  currentUser: AppUser;
  isOpen: boolean;
  onClose: () => void;
  selectedRecipient?: AppUser | null;
  onSelectRecipient?: (user: AppUser | null) => void;
}

export const TeamChatDrawer: React.FC<TeamChatDrawerProps> = ({
  currentUser,
  isOpen,
  onClose,
  selectedRecipient,
  onSelectRecipient,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isConnected, setIsConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<'BROADCAST' | 'DIRECT'>('BROADCAST');
  const [isMinimized, setIsMinimized] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [contactSearch, setContactSearch] = useState('');
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // When selectedRecipient prop changes, switch to DIRECT mode
  useEffect(() => {
    if (selectedRecipient) {
      setActiveTab('DIRECT');
    }
  }, [selectedRecipient]);

  // Load existing chat history from REST endpoint
  const loadMessages = () => {
    fetch(`/api/chat/messages?userId=${currentUser.id}&role=${currentUser.role}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.messages) {
          setMessages(data.messages);
        }
      })
      .catch((err) => console.warn('Could not load chat messages:', err));
  };

  useEffect(() => {
    loadMessages();
  }, [currentUser.id, currentUser.role]);

  // WebSocket Connection
  useEffect(() => {
    let ws: WebSocket | null = null;
    let reconnectTimeout: any = null;
    let pollingInterval: any = null;
    let retryCount = 0;

    const connectWs = () => {
      // Avoid excessive reconnect attempts if WebSockets are not supported or blocked by proxy
      if (retryCount >= 3) {
        // Fall back entirely to polling
        if (!pollingInterval) {
          pollingInterval = setInterval(loadMessages, 10000);
        }
        return;
      }

      const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${proto}//${window.location.host}/ws/chat`;

      try {
        ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          setIsConnected(true);
          retryCount = 0;
          if (pollingInterval) {
            clearInterval(pollingInterval);
            pollingInterval = null;
          }
          // Register current user
          ws?.send(
            JSON.stringify({
              type: 'REGISTER_USER',
              userId: currentUser.id,
            })
          );
        };

        ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'NEW_CHAT_MESSAGE' && data.message) {
              setMessages((prev) => {
                // Prevent duplicate addition
                if (prev.some((m) => m.id === data.message.id)) return prev;
                return [...prev, data.message];
              });
            }
          } catch (e) {
            // Safe parse error ignore
          }
        };

        ws.onclose = () => {
          setIsConnected(false);
          retryCount++;
          // Auto-reconnect with backoff, max 3 tries before falling back to REST polling
          if (retryCount < 3) {
            reconnectTimeout = setTimeout(connectWs, 5000);
          } else if (!pollingInterval) {
            pollingInterval = setInterval(loadMessages, 10000);
          }
        };

        ws.onerror = () => {
          // Handled via onclose and fallback polling
        };
      } catch (err) {
        retryCount++;
        if (!pollingInterval) {
          pollingInterval = setInterval(loadMessages, 10000);
        }
      }
    };

    connectWs();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (pollingInterval) clearInterval(pollingInterval);
      if (ws) {
        ws.onclose = null;
        ws.close();
      }
    };
  }, [currentUser.id]);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTab, selectedRecipient]);

  // Filter messages based on active tab and recipient
  const displayedMessages = messages.filter((m) => {
    if (activeTab === 'BROADCAST') {
      return m.recipientId === 'BROADCAST_ALL';
    } else {
      // Direct message thread
      if (!selectedRecipient) return false;
      return (
        (m.senderId === currentUser.id && m.recipientId === selectedRecipient.id) ||
        (m.senderId === selectedRecipient.id && m.recipientId === currentUser.id) ||
        (currentUser.role !== 'CLEANER' && (m.senderId === selectedRecipient.id || m.recipientId === selectedRecipient.id))
      );
    }
  });

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const payload = {
      senderId: currentUser.id,
      senderName: currentUser.name,
      senderRole: currentUser.role,
      recipientId: activeTab === 'BROADCAST' ? 'BROADCAST_ALL' : selectedRecipient?.id || 'BROADCAST_ALL',
      recipientName: activeTab === 'BROADCAST' ? 'All Team Members' : selectedRecipient?.name,
      text: inputText.trim(),
    };

    // Send via WebSocket if open, else fallback to REST
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: 'SEND_MESSAGE',
          ...payload,
        })
      );
    } else {
      fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
        .then((r) => r.json())
        .then((data) => {
          if (data.message) {
            setMessages((prev) => [...prev, data.message]);
          }
        })
        .catch((err) => console.warn('Failed to send message:', err));
    }

    setInputText('');
  };

  if (!isOpen) return null;

  // Other team members to direct message
  const chatPartners = APP_USERS.filter((u) => u.id !== currentUser.id);

  return (
    <div 
      className={`fixed bottom-4 right-4 z-50 bg-white rounded-2xl shadow-2xl border border-slate-300 flex flex-col overflow-hidden transition-all duration-200 ${
        isMinimized ? 'w-80 h-14' : 'w-96 sm:w-[420px] h-[520px] max-h-[85vh]'
      }`}
    >
      {/* Top Header Bar */}
      <div className="bg-slate-900 text-white p-3.5 flex items-center justify-between shrink-0 select-none">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-purple-600 flex items-center justify-center text-white shadow-xs">
              <MessageSquare className="w-4 h-4" />
            </div>
            <span 
              className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-slate-900 ${
                isConnected ? 'bg-emerald-500' : 'bg-amber-500'
              }`} 
              title={isConnected ? 'Connected Live' : 'Reconnecting...'}
            />
          </div>
          <div className="min-w-0">
            <h3 className="font-extrabold text-xs text-white leading-tight flex items-center gap-1.5 truncate">
              <span>Team Dispatch Chat</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/15 text-pink-300">
                {currentUser.role}
              </span>
            </h3>
            <p className="text-[10px] text-slate-400 truncate">
              Signed in as <strong className="text-slate-200">{currentUser.name}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={() => setIsMinimized((m) => !m)}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
            title={isMinimized ? 'Expand Chat' : 'Minimize Chat'}
          >
            {isMinimized ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg cursor-pointer transition-colors"
            title="Close Chat"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Channel Tabs: Broadcast vs Direct Member */}
          <div className="p-2 bg-slate-100/90 border-b border-slate-200 flex items-center gap-1 shrink-0 text-xs font-bold">
            <button
              onClick={() => {
                setActiveTab('BROADCAST');
                if (onSelectRecipient) onSelectRecipient(null);
              }}
              className={`flex-1 py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'BROADCAST'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Radio className="w-3.5 h-3.5 text-pink-600" />
              <span>All Staff Radio</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('DIRECT');
                if (!selectedRecipient && chatPartners.length > 0 && onSelectRecipient) {
                  onSelectRecipient(chatPartners[0]);
                }
              }}
              className={`flex-1 py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'DIRECT'
                  ? 'bg-white text-slate-900 shadow-2xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-purple-600" />
              <span>Direct Chat</span>
            </button>
          </div>

          {/* Direct Partner Selector if in DIRECT mode */}
          {activeTab === 'DIRECT' && (
            <div className="p-2.5 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-purple-200/80 flex items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs text-white shrink-0 shadow-2xs ${
                  selectedRecipient?.role === 'OWNER'
                    ? 'bg-purple-600'
                    : selectedRecipient?.role === 'DISPATCHER'
                    ? 'bg-pink-600'
                    : 'bg-emerald-600'
                }`}>
                  {selectedRecipient?.name ? selectedRecipient.name.split(' ').map((n) => n[0]).join('') : '?'}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-xs font-black text-slate-900 truncate">
                      {selectedRecipient?.name || 'Select Contact'}
                    </span>
                    <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-purple-200/60 text-purple-900 uppercase">
                      {selectedRecipient?.role}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 truncate">
                    {selectedRecipient?.assignedVan || selectedRecipient?.title || ''}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowContactPicker((v) => !v)}
                className="px-2.5 py-1 rounded-lg bg-white border border-purple-300 hover:bg-purple-100 text-purple-900 text-xs font-bold transition-all shadow-2xs cursor-pointer flex items-center gap-1 shrink-0"
              >
                <Users className="w-3.5 h-3.5 text-purple-600" />
                <span>{showContactPicker ? 'Hide List' : 'Switch Contact'}</span>
              </button>
            </div>
          )}

          {/* Slide-Down Contact Picker Roster */}
          {activeTab === 'DIRECT' && showContactPicker && (
            <div className="p-3 bg-white border-b border-purple-200 max-h-56 overflow-y-auto space-y-1.5 shadow-inner">
              <div className="relative mb-2">
                <input
                  type="text"
                  placeholder="Filter team members by name or van..."
                  value={contactSearch}
                  onChange={(e) => setContactSearch(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-purple-500 shadow-inner"
                />
              </div>

              {chatPartners
                .filter((p) => {
                  if (!contactSearch.trim()) return true;
                  const q = contactSearch.toLowerCase();
                  return p.name.toLowerCase().includes(q) || (p.assignedVan && p.assignedVan.toLowerCase().includes(q));
                })
                .map((p) => {
                  const isSelected = selectedRecipient?.id === p.id;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => {
                        if (onSelectRecipient) onSelectRecipient(p);
                        setShowContactPicker(false);
                      }}
                      className={`w-full p-2 rounded-xl text-left flex items-center justify-between gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-100/80 border border-purple-400 font-bold text-purple-950'
                          : 'bg-slate-50 hover:bg-purple-50 border border-slate-200/80 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <div className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px] text-white shrink-0 ${
                          p.role === 'OWNER' ? 'bg-purple-600' : p.role === 'DISPATCHER' ? 'bg-pink-600' : 'bg-emerald-600'
                        }`}>
                          {p.name.split(' ').map((n) => n[0]).join('')}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate leading-tight">{p.name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{p.assignedVan || p.title}</p>
                        </div>
                      </div>

                      <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded-full shrink-0 ${
                        p.role === 'OWNER' ? 'bg-purple-200 text-purple-800' : p.role === 'DISPATCHER' ? 'bg-pink-200 text-pink-800' : 'bg-emerald-200 text-emerald-800'
                      }`}>
                        {p.role}
                      </span>
                    </button>
                  );
                })}
            </div>
          )}

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-slate-50/70">
            {displayedMessages.length === 0 ? (
              <div className="h-44 flex flex-col items-center justify-center text-center p-4 text-slate-400">
                <MessageSquare className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs font-bold text-slate-600">No Messages Yet</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {activeTab === 'BROADCAST'
                    ? 'Post an announcement to all 15 cleaning units and dispatchers.'
                    : `Send a direct one-on-one message to ${selectedRecipient?.name || 'this team member'}.`}
                </p>
              </div>
            ) : (
              displayedMessages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} space-y-1`}
                  >
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <span className="font-bold text-slate-700">{msg.senderName}</span>
                      <span className="px-1 py-0.2 rounded bg-slate-200/80 text-slate-600 font-mono text-[9px]">
                        {msg.senderRole}
                      </span>
                      <span>•</span>
                      <span>
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed shadow-2xs ${
                        isMe
                          ? 'bg-gradient-to-r from-pink-600 to-purple-600 text-white rounded-br-xs'
                          : 'bg-white border border-slate-200 text-slate-800 rounded-bl-xs'
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Preset Action Chips */}
          <div className="px-3 py-1.5 bg-slate-100 border-t border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar shrink-0">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider shrink-0">Quick:</span>
            {[
              'On site now',
              'Leaving first stop',
              'Oven clean complete',
              'Need supplies restock',
              'Keys locked in lockbox',
            ].map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setInputText(preset)}
                className="px-2 py-0.5 rounded-full bg-white border border-slate-200 text-[10px] font-medium text-slate-700 hover:bg-pink-50 hover:text-pink-700 hover:border-pink-300 transition-colors whitespace-nowrap cursor-pointer shrink-0"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSendMessage} className="p-2.5 bg-white border-t border-slate-200 flex items-center gap-2 shrink-0">
            <input
              type="text"
              placeholder={
                activeTab === 'BROADCAST'
                  ? 'Broadcast message to all crew...'
                  : `Message ${selectedRecipient?.name || 'team member'}...`
              }
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-pink-500 transition-all shadow-inner"
            />
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="p-2 rounded-xl bg-gradient-to-r from-pink-600 to-purple-600 text-white hover:opacity-95 disabled:opacity-40 transition-all shadow-xs cursor-pointer active:scale-95"
              title="Send Message"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </>
      )}
    </div>
  );
};
