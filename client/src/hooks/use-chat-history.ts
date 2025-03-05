import { useEffect } from "react";
import { Message } from "@shared/schema";

const CHAT_HISTORY_KEY = "chat_history";

export function useChatHistory(messages: Message[], onLoad: (messages: Message[]) => void) {
  // Load chat history from localStorage on component mount
  useEffect(() => {
    const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
    if (savedHistory) {
      const parsedHistory = JSON.parse(savedHistory) as Message[];
      onLoad(parsedHistory);
    }
  }, [onLoad]);

  // Save chat history to localStorage whenever messages change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
    }
  }, [messages]);

  const clearHistory = () => {
    localStorage.removeItem(CHAT_HISTORY_KEY);
  };

  return { clearHistory };
}
