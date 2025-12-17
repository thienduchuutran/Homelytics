'use client';

import { useState, useEffect, useRef } from 'react';
import ChatPanel from './ChatPanel';

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Listen for open event
  useEffect(() => {
    const handleOpenChat = () => {
      setIsOpen(true);
    };

    window.addEventListener('pnc:open-chat', handleOpenChat);

    return () => {
      window.removeEventListener('pnc:open-chat', handleOpenChat);
    };
  }, []);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => {
        document.removeEventListener('keydown', handleEscape);
      };
    }
  }, [isOpen]);

  // Handle click outside
  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      setIsOpen(false);
    }
  };

  // Handle panel click (prevent closing when clicking inside)
  const handlePanelClick = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 z-[90] w-14 h-14 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        }`}
        aria-label="Open chat assistant"
      >
        <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </button>

      {/* Chat Panel Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-[100] pointer-events-none"
          onClick={handleOverlayClick}
        >
          {/* Backdrop (invisible but clickable) */}
          <div className="absolute inset-0" />
          
          {/* Panel */}
          <div
            ref={panelRef}
            onClick={handlePanelClick}
            className="absolute bottom-0 right-0 w-full sm:w-96 h-[600px] max-h-[85vh] bg-white rounded-t-2xl sm:rounded-b-2xl sm:rounded-tl-2xl sm:mb-6 sm:mr-6 shadow-2xl pointer-events-auto flex flex-col overflow-hidden chat-widget-panel"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white flex-shrink-0">
              <h2 className="text-lg font-semibold text-gray-900">AI Assistant</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Close chat"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Chat Panel Content */}
            <div className="flex-1 overflow-hidden">
              <ChatPanel variant="widget" onClose={() => setIsOpen(false)} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}

