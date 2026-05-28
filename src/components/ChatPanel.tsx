import React, { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, Brain, Bot, User, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import type { ChatMessage } from '../utils/gemini';

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  hasData: boolean;
  hasApiKey: boolean;
}

/**
 * Super simple helper to format markdown elements (**bold**, `code`, lists) to JSX.
 */
const formatMarkdown = (text: string): React.ReactNode[] => {
  if (!text) return [];
  const lines = text.split('\n');

  return lines.map((line, lineIdx) => {
    // Check if it's a bullet point
    const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*');
    let content = isBullet ? line.trim().substring(1).trim() : line;

    // Parse **bold** and `code` inline elements
    const parts: React.ReactNode[] = [];
    let currentIdx = 0;
    
    // Regular expression matching bold or code snippets
    const regex = /(\*\*.*?\*\*|`.*?`)/g;
    let match;
    let partIdx = 0;

    while ((match = regex.exec(content)) !== null) {
      const matchStr = match[0];
      const matchIndex = match.index;

      // Add text preceding the match
      if (matchIndex > currentIdx) {
        parts.push(content.substring(currentIdx, matchIndex));
      }

      if (matchStr.startsWith('**') && matchStr.endsWith('**')) {
        parts.push(<strong key={partIdx++}>{matchStr.slice(2, -2)}</strong>);
      } else if (matchStr.startsWith('`') && matchStr.endsWith('`')) {
        parts.push(<code key={partIdx++}>{matchStr.slice(1, -1)}</code>);
      }

      currentIdx = regex.lastIndex;
    }

    if (currentIdx < content.length) {
      parts.push(content.substring(currentIdx));
    }

    if (isBullet) {
      return (
        <li key={lineIdx} style={{ marginLeft: '1rem', marginBottom: '0.4rem', listStyleType: 'disc' }}>
          {parts.length > 0 ? parts : content}
        </li>
      );
    }

    return (
      <p key={lineIdx} style={{ margin: '0 0 0.5rem 0' }}>
        {parts.length > 0 ? parts : content}
      </p>
    );
  });
};

/**
 * Accordion component to render the step-by-step thinking process of the AI Analyst.
 */
const ThinkingAccordion: React.FC<{ thinking: string }> = ({ thinking }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="chat-thinking-accordion">
      <div className="chat-thinking-header" onClick={() => setIsOpen(!isOpen)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <Brain size={12} />
          <span>{isOpen ? 'Hide' : 'Show'} Analyst Reasoning Chain</span>
        </div>
        {isOpen ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </div>
      {isOpen && (
        <div className="chat-thinking-body">
          {thinking}
        </div>
      )}
    </div>
  );
};

export const ChatPanel: React.FC<ChatPanelProps> = ({
  messages,
  onSendMessage,
  isLoading,
  hasData,
  hasApiKey
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = () => {
    if (!inputValue.trim() || isLoading) return;
    onSendMessage(inputValue.trim());
    setInputValue('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const defaultSuggestions = [
    'What are the core trends or patterns in this sheet?',
    'Give me a summary statistics report of key numbers.',
    'Are there any anomalies, outliers, or missing values?',
    'Recommend some chart visualizations to explore.'
  ];

  return (
    <div className="chat-container">
      {/* Panel Header */}
      <div className="chat-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sparkles size={16} style={{ color: 'hsl(var(--primary))' }} />
          <h3 style={{ margin: 0, fontSize: '1rem', fontFamily: 'var(--font-display)' }}>AI Analyst Chat</h3>
        </div>
        <div className="badge badge-cyan" style={{ fontSize: '0.65rem' }}>
          Gemini 3.5 Flash
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="chat-messages">
        {messages.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center', padding: '1rem' }}>
            <div
              style={{
                width: '3.5rem',
                height: '3.5rem',
                borderRadius: '50%',
                background: 'hsl(var(--primary-glow))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'hsl(var(--primary))',
                marginBottom: '1rem'
              }}
            >
              <Bot size={24} />
            </div>
            <h4 style={{ marginBottom: '0.5rem', fontFamily: 'var(--font-display)' }}>Meet your AI Data Analyst</h4>
            <p style={{ fontSize: '0.85rem', color: 'hsl(var(--text-secondary))', maxWidth: '300px', marginBottom: '1.5rem' }}>
              {!hasData 
                ? 'Upload an Excel spreadsheet first, and then we will automatically start drawing data insights.' 
                : 'Ask questions about your data, request charts, summaries, or deep dives!'}
            </p>

            {hasData && (
              <div style={{ width: '100%', maxWidth: '320px' }}>
                <p style={{ fontSize: '0.75rem', fontWeight: 600, color: 'hsl(var(--text-muted))', textTransform: 'uppercase', marginBottom: '0.5rem', textAlign: 'left' }}>
                  Suggested Starters:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {defaultSuggestions.map((s, idx) => (
                    <button
                      key={idx}
                      className="suggestion-chip"
                      style={{ textAlign: 'left', whiteSpace: 'normal', width: '100%', borderRadius: '8px' }}
                      onClick={() => onSendMessage(s)}
                      disabled={!hasApiKey}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div
              key={idx}
              className={`chat-message ${msg.role === 'user' ? 'chat-message-user' : ''}`}
            >
              {/* Header Label */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'hsl(var(--text-muted))', alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                {msg.role === 'user' ? (
                  <>
                    <span>You</span>
                    <User size={10} />
                  </>
                ) : (
                  <>
                    <Bot size={10} style={{ color: 'hsl(var(--primary))' }} />
                    <span style={{ color: 'hsl(var(--text-secondary))', fontWeight: 500 }}>Antigravity Analyst</span>
                  </>
                )}
              </div>

              {/* Message Bubble */}
              <div className={`chat-bubble ${msg.role === 'user' ? 'chat-bubble-user' : 'chat-bubble-bot'}`} style={{ border: msg.isError ? '1px solid hsl(var(--error) / 0.3)' : undefined, backgroundColor: msg.isError ? 'rgba(239, 68, 68, 0.05)' : undefined }}>
                {msg.role === 'user' ? (
                  <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                ) : msg.isError ? (
                  <div style={{ display: 'flex', gap: '0.5rem', color: 'hsl(var(--error))', fontSize: '0.85rem' }}>
                    <AlertCircle size={16} style={{ flexShrink: 0 }} />
                    <span>{msg.content}</span>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {msg.analystResponse?.thinking && (
                      <ThinkingAccordion thinking={msg.analystResponse.thinking} />
                    )}
                    <ul style={{ margin: 0, padding: 0 }}>
                      {msg.analystResponse?.insights.map((insight, idx) => (
                        <div key={idx}>{formatMarkdown(insight)}</div>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Followup suggestions if bot replied */}
              {msg.role === 'model' && msg.analystResponse?.followUpQuestions && msg.analystResponse.followUpQuestions.length > 0 && idx === messages.length - 1 && !isLoading && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.4rem' }}>
                  {msg.analystResponse.followUpQuestions.map((q, qIdx) => (
                    <button
                      key={qIdx}
                      className="suggestion-chip"
                      style={{ alignSelf: 'flex-start', whiteSpace: 'normal', textAlign: 'left', fontSize: '0.775rem' }}
                      onClick={() => onSendMessage(q)}
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="chat-message">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.75rem', color: 'hsl(var(--text-muted))' }}>
              <Bot size={10} style={{ color: 'hsl(var(--primary))' }} />
              <span>Analyzing dataset...</span>
            </div>
            <div className="chat-bubble chat-bubble-bot" style={{ display: 'inline-flex', padding: '0.5rem 0.75rem' }}>
              <div className="loading-dots">
                <div className="loading-dot" />
                <div className="loading-dot" />
                <div className="loading-dot" />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Form Box */}
      <div className="chat-input-area">
        <div className="chat-input-wrapper" style={{ opacity: !hasData && messages.length === 0 ? 0.6 : 1 }}>
          <input
            type="text"
            className="chat-text-input"
            placeholder={
              !hasData
                ? 'Upload Excel sheet to begin...'
                : 'Ask questions, e.g., "Compare values by department"...'
            }
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={!hasData || isLoading}
          />
          <button
            className="btn btn-primary"
            style={{ width: '2rem', height: '2rem', padding: 0, borderRadius: '50%', flexShrink: 0, marginRight: '0.25rem' }}
            onClick={handleSend}
            disabled={!inputValue.trim() || !hasData || isLoading}
          >
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
};
