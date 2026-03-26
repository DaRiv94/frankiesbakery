import React, { useEffect, useMemo, useRef, useState } from "react";

const CHAT_API_URL =
  process.env.REACT_APP_CHAT_API_URL ||
  "https://func-ais-eus2-frankies-bakery-test-backend-ddbhbudwbcdwemaq.eastus2-01.azurewebsites.net/api/chat";

const STARTER_QUESTIONS = [
  "What can you help me with?",
  "I want to place an order",
];

const normalizeReferences = (value) => {
  if (!value) return [];

  const list = Array.isArray(value) ? value : [value];

  return list
    .map((item, index) => {
      if (typeof item === "string") {
        return {
          id: `ref-${index}`,
          title: item,
          url: "",
        };
      }

      if (!item || typeof item !== "object") {
        return null;
      }

      const title =
        item.title || item.name || item.label || item.source || `Reference ${index + 1}`;
      const url = item.url || item.link || item.href || "";

      return {
        id: item.id || `ref-${index}`,
        title,
        url,
      };
    })
    .filter(Boolean);
};

const URL_SPLIT_REGEX = /(https?:\/\/[^\s]+)/gi;

const renderMessageWithLinks = (message) => {
  const text = String(message || "");
  const parts = text.split(URL_SPLIT_REGEX);

  return parts.map((part, index) => {
    const isUrl = /^https?:\/\/[^\s]+$/i.test(part);

    if (!isUrl) {
      return <React.Fragment key={`text-${index}`}>{part}</React.Fragment>;
    }

    return (
      <a
        key={`url-${index}`}
        href={part}
        target="_blank"
        rel="noreferrer"
        className="chat-message-link"
      >
        {part}
      </a>
    );
  });
};

export const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(true);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [conversationId, setConversationId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const messagesContainerRef = useRef(null);

  const hasMessages = messages.length > 0;

  const placeholderText = useMemo(() => {
    if (isLoading) return "Frankie's Bakery agent is thinking...";
    return "Type your message...";
  }, [isLoading]);

  useEffect(() => {
    const node = messagesContainerRef.current;
    if (!node) return;
    node.scrollTop = node.scrollHeight;
  }, [messages, isLoading]);

  const startNewConversation = () => {
    setConversationId(null);
    setMessages([]);
    setInput("");
  };

  const sendMessage = async (text) => {
    const outgoing = String(text || "").trim();
    if (!outgoing || isLoading) return;

    setMessages((current) => [
      ...current,
      {
        id: `user-${Date.now()}`,
        role: "user",
        message: outgoing,
      },
    ]);
    setInput("");
    setIsLoading(true);

    try {
      const payload = {
        message: outgoing,
      };

      if (conversationId) {
        payload.conversation_id = conversationId;
      }

      const response = await fetch(CHAT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Unable to get a response right now.");
      }

      const assistantText = data?.message || "I received your message.";
      const refs = normalizeReferences(
        data?.references || data?.citations || data?.sources
      );

      setConversationId(data?.conversation_id || null);
      setMessages((current) => [
        ...current,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          message: assistantText,
          references: refs,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: `assistant-error-${Date.now()}`,
          role: "assistant",
          message:
            error?.message ||
            "Sorry, I couldn't complete that request. Please try again.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    sendMessage(input);
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        className="chat-launcher"
        onClick={() => setIsOpen(true)}
        aria-label="Open customer support chat"
      >
        💬
      </button>
    );
  }

  return (
    <div className="chat-widget" role="complementary" aria-label="Customer support chat">
      <div className="chat-widget__header">
        <div>
          <p className="chat-widget__eyebrow">Frankie's Bakery</p>
          <h3>Customer Support Agent</h3>
        </div>
        <div className="chat-widget__actions">
          <button type="button" onClick={startNewConversation} disabled={isLoading}>
            New chat
          </button>
          <button
            type="button"
            className="chat-widget__icon-button"
            onClick={() => setIsOpen(false)}
            aria-label="Minimize chat"
          >
            ×
          </button>
        </div>
      </div>

      {!hasMessages ? (
        <div className="chat-widget__starter-wrap">
          <p>Try one of these:</p>
          <div className="chat-widget__starter-grid">
            {STARTER_QUESTIONS.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => sendMessage(question)}
                disabled={isLoading}
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="chat-widget__messages" ref={messagesContainerRef}>
        {messages.map((item) => (
          <div key={item.id} className={`chat-bubble chat-bubble--${item.role}`}>
            <p>{renderMessageWithLinks(item.message)}</p>
            {item.references?.length ? (
              <div className="chat-bubble__references">
                <span>References:</span>
                <ul>
                  {item.references.map((reference) => (
                    <li key={reference.id}>
                      {reference.url ? (
                        <a href={reference.url} target="_blank" rel="noreferrer">
                          {reference.title}
                        </a>
                      ) : (
                        <span>{reference.title}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ))}

        {isLoading ? (
          <div className="chat-bubble chat-bubble--assistant chat-bubble--loading">
            <span className="chat-typing-dot" />
            <span className="chat-typing-dot" />
            <span className="chat-typing-dot" />
          </div>
        ) : null}
      </div>

      <form className="chat-widget__composer" onSubmit={handleSubmit}>
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={placeholderText}
          aria-label="Type a message"
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
};
