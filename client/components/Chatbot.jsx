"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { chatAPI } from "@/lib/api";
import { Loader2, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function Chatbot() {
  const [isOpen, setIsOpen] = useState(false); // Closed by default
  const [messages, setMessages] = useState([]); // Always start with empty messages
  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false); // No loading since we're not fetching
  const { user } = useAuth();
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);
  const chatWindowRef = useRef(null);
  const chatButtonRef = useRef(null);

  const sessionId = user?.id || user?._id || "default";

  // Reset messages on mount and when chatbot opens (no chat history fetching)
  useEffect(() => {
    // Reset on initial mount
    setMessages([]);
    setInputMessage("");
  }, []); // Only run on mount

  // Reset when chatbot is reopened
  useEffect(() => {
    if (isOpen && user) {
      setMessages([]); // Reset messages every time it opens
      setInputMessage(""); // Reset input
    }
  }, [isOpen, user]);

  // Handle click outside to close chatbot
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Only check if chatbot is open and click is outside the chat window
      if (
        isOpen &&
        chatWindowRef.current &&
        !chatWindowRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      // Use a small delay to avoid immediate closing when opening
      const timeoutId = setTimeout(() => {
        document.addEventListener("mousedown", handleClickOutside);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  // Auto-scroll to bottom when messages change (only if user is at bottom)
  useEffect(() => {
    if (messagesContainerRef.current) {
      // Only auto-scroll if user is near the bottom (within 150px)
      const container = messagesContainerRef.current;
      const isNearBottom =
        container.scrollHeight - container.scrollTop - container.clientHeight <
        150;

      if (isNearBottom || messages.length <= 1) {
        setTimeout(() => {
          scrollToBottom();
        }, 100);
      }
    }
  }, [messages]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    } else if (messagesEndRef.current) {
      // Fallback to scrollIntoView
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = inputMessage.trim();
    setInputMessage("");

    // Add user message to UI immediately
    const newUserMessage = {
      type: "user",
      content: userMessage,
    };
    setMessages((prev) => [...prev, newUserMessage]);

    setIsLoading(true);

    try {
      const response = await chatAPI.sendMessage(userMessage, sessionId);

      // Add assistant response
      const assistantMessage = {
        type: "assistant",
        content: response.output || "Sorry, I couldn't process that request.",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error("Error sending message:", error);
      const errorMessage = {
        type: "assistant",
        content:
          "Sorry, there was an error processing your message. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
      // Focus input after sending
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // Triangle logo component for AI messages
  const AILogo = () => (
    <div className="shrink-0 w-8 h-8 flex items-center justify-center">
      <div className="relative w-6 h-6">
        <svg
          viewBox="0 0 24 24"
          className="w-full h-full"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 2L22 20H2L12 2Z" fill="url(#gradient)" />
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#3b82f6" />
              <stop offset="50%" stopColor="#6b7280" />
              <stop offset="100%" stopColor="#6b7280" />
            </linearGradient>
          </defs>
        </svg>
      </div>
    </div>
  );

  // User avatar component
  const UserAvatar = () => (
    <div className="shrink-0 w-8 h-8 rounded-full bg-linear-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white text-sm font-semibold shadow-md">
      {user?.name?.charAt(0).toUpperCase() || "U"}
    </div>
  );

  if (!user) {
    return null; // Don't show chatbot if user is not logged in
  }

  return (
    <>
      {/* Chat Button - Fixed bottom right */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50">
          <Button
            ref={chatButtonRef}
            onClick={toggleChat}
            className="h-14 w-14 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white cursor-pointer"
            size="icon"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </div>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          ref={chatWindowRef}
          className="fixed bottom-6 right-6 z-50 w-96 h-[600px] flex flex-col shadow-2xl rounded-lg overflow-hidden bg-white border border-gray-200"
        >
          {/* Header */}
          <div className="bg-linear-to-r from-blue-600 to-blue-700 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5" />
              <h3 className="font-semibold">Lean Assistant</h3>
            </div>
            <Button
              onClick={toggleChat}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:bg-blue-800"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Messages Area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto p-4 min-h-0"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-500">
                <MessageCircle className="h-12 w-12 mb-3 text-gray-300" />
                <p className="text-sm">
                  Start a conversation with the AI assistant
                </p>
                <p className="text-xs mt-1 text-gray-400">
                  Ask questions about candidates, jobs, or recruitment
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex items-start gap-2 ${
                      message.type === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.type === "assistant" && <AILogo />}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 ${
                        message.type === "user"
                          ? "bg-blue-600 text-white"
                          : "bg-gray-100 text-gray-900"
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap wrap-break-word">
                        {message.content}
                      </p>
                    </div>
                    {message.type === "user" && <UserAvatar />}
                  </div>
                ))}
                {isLoading && (
                  <div className="flex items-start gap-2 justify-start">
                    <AILogo />
                    <div className="bg-gray-100 rounded-lg px-4 py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>

          {/* Input Area */}
          <form
            onSubmit={handleSendMessage}
            className="p-4 border-t border-gray-200"
          >
            <div className="flex gap-2">
              <Input
                ref={inputRef}
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your message..."
                disabled={isLoading}
                className="flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
              />
              <Button
                type="submit"
                disabled={!inputMessage.trim() || isLoading}
                className="bg-blue-600 hover:bg-blue-700"
                size="icon"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
