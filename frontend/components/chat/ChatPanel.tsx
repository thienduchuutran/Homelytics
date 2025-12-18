'use client';

import { useState, useEffect, useRef } from 'react';
import { House } from '@/types/house';
import HouseCard from '@/components/HouseCard';

interface MustHaveFilters {
  spa?: boolean;
  seniorCommunity?: boolean;
  cooling?: boolean;
  attachedGarage?: boolean;
  pool?: boolean;
  garage?: boolean;
  fireplace?: boolean;
  view?: boolean;
  newConstruction?: boolean;
}

interface ChatFilters {
  minPrice?: number;
  maxPrice?: number;
  minBeds?: number;
  minBaths?: number;
  minSqft?: number;
  propertyTypes?: string[];
  type?: string;
  city?: string;
  zip?: string;
  keywords?: string | string[];
  minLotSqft?: number;
  minLotAcres?: number;
  lotFeatures?: string[];
  hasHOA?: boolean;
  maxHOA?: number;
  hoaFrequency?: string;
  mustHave?: MustHaveFilters;
  maxDaysOnMarket?: number;
  listedAfter?: string;
  attached?: boolean;
  [key: string]: unknown;
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  filters?: ChatFilters;
  properties?: House[];
  timestamp: number;
}

interface ChatPanelProps {
  variant?: 'page' | 'widget';
  onClose?: () => void;
  onQuickView?: (propertyId: string) => void;
}

const CHAT_HISTORY_KEY = 'pnc:chat:history:v1';
const CHAT_CONTEXT_KEY = 'pnc:chat:context:v1';

const SUGGESTIONS = [
  '4 beds with a big yard',
  'No HOA under $800k',
  'New listings in Irvine last 7 days',
  'Townhomes with attached garage',
  'Senior community with pool',
  'reset'
];

export default function ChatPanel({ variant = 'page', onQuickView }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentFilters, setCurrentFilters] = useState<ChatFilters>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem(CHAT_HISTORY_KEY);
      const savedContext = localStorage.getItem(CHAT_CONTEXT_KEY);
      
      if (savedHistory) {
        const parsed = JSON.parse(savedHistory);
        if (Array.isArray(parsed)) {
          setMessages(parsed);
        }
      }
      
      if (savedContext) {
        const parsed = JSON.parse(savedContext);
        setCurrentFilters(parsed);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(messages));
      localStorage.setItem(CHAT_CONTEXT_KEY, JSON.stringify(currentFilters));
    } catch (error) {
      console.error('Error saving chat history:', error);
    }
  }, [messages, currentFilters]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  // Client-side filtering for filters not supported by PHP endpoint
  // Note: Most filters are now handled server-side, but we keep this for any edge cases
  const applyClientSideFilters = (houses: House[], filters: ChatFilters): House[] => {
    let filtered = [...houses];

    // Filter by property types array (if multiple types specified and server only used first)
    if (filters.propertyTypes && Array.isArray(filters.propertyTypes) && filters.propertyTypes.length > 1) {
      filtered = filtered.filter(house => {
        const houseType = house.propertyType || '';
        return filters.propertyTypes!.some((type: string) => 
          houseType.toLowerCase().includes(type.toLowerCase())
        );
      });
    }

    // Keywords are now handled server-side, but keep client-side as fallback for description search
    if (filters.keywords) {
      const keywordArray = Array.isArray(filters.keywords) ? filters.keywords : [filters.keywords];
      if (keywordArray.length > 0) {
        filtered = filtered.filter(house => {
          const searchText = `${house.description || ''} ${house.address || ''} ${house.city || ''}`.toLowerCase();
          return keywordArray.some((keyword: string) => 
            searchText.includes(keyword.toLowerCase())
          );
        });
      }
    }

    return filtered;
  };

  // Fetch properties using existing API logic
  const fetchProperties = async (filters: ChatFilters): Promise<House[]> => {
    const params = new URLSearchParams();
    
    // Map Gemini filters to API params (server-side supported filters)
    if (filters.minPrice) params.append('minPrice', filters.minPrice.toString());
    if (filters.maxPrice) params.append('maxPrice', filters.maxPrice.toString());
    if (filters.minBeds) params.append('bedrooms', filters.minBeds.toString());
    if (filters.minBaths) params.append('bathrooms', filters.minBaths.toString());
    if (filters.minSqft) params.append('minSqft', filters.minSqft.toString());
    
    // Handle property type: use first from array if array, otherwise use single type
    if (filters.propertyTypes && Array.isArray(filters.propertyTypes) && filters.propertyTypes.length > 0) {
      params.append('propertyType', filters.propertyTypes[0]);
    } else if (filters.type && filters.type !== 'all') {
      params.append('propertyType', filters.type);
    }
    
    if (filters.city) params.append('search', filters.city);
    if (filters.zip) params.append('search', filters.zip);
    
    // Lot/Yard filters
    if (filters.minLotSqft) params.append('minLotSqft', filters.minLotSqft.toString());
    if (filters.minLotAcres) params.append('minLotAcres', filters.minLotAcres.toString());
    if (filters.lotFeatures && Array.isArray(filters.lotFeatures) && filters.lotFeatures.length > 0) {
      params.append('lotFeatures', filters.lotFeatures.join(','));
    }
    
    // HOA filters
    if (filters.hasHOA !== undefined && filters.hasHOA !== null) {
      params.append('hasHOA', filters.hasHOA ? '1' : '0');
    }
    if (filters.maxHOA) params.append('maxHOA', filters.maxHOA.toString());
    if (filters.hoaFrequency) params.append('hoaFrequency', filters.hoaFrequency);
    
    // Extended must-have filters
    if (filters.mustHave) {
      if (filters.mustHave.spa === true) params.append('mustHaveSpa', '1');
      if (filters.mustHave.seniorCommunity === true) params.append('mustHaveSeniorCommunity', '1');
      if (filters.mustHave.cooling === true) params.append('mustHaveCooling', '1');
      if (filters.mustHave.attachedGarage === true) params.append('mustHaveAttachedGarage', '1');
      if (filters.mustHave.pool === true) params.append('mustHavePool', '1');
      if (filters.mustHave.garage === true) params.append('mustHaveGarage', '1');
      if (filters.mustHave.fireplace === true) params.append('mustHaveFireplace', '1');
      if (filters.mustHave.view === true) params.append('mustHaveView', '1');
      if (filters.mustHave.newConstruction === true) params.append('mustHaveNewConstruction', '1');
    }
    
    // Time/Market filters
    if (filters.maxDaysOnMarket) params.append('maxDaysOnMarket', filters.maxDaysOnMarket.toString());
    if (filters.listedAfter) params.append('listedAfter', filters.listedAfter);
    
    // Attached/Detached filter
    if (filters.attached !== undefined && filters.attached !== null) {
      params.append('attached', filters.attached ? '1' : '0');
    }
    
    // Keywords filter
    if (filters.keywords && Array.isArray(filters.keywords) && filters.keywords.length > 0) {
      params.append('keywords', filters.keywords.join(','));
    }
    
    // Default to for-sale if not specified
    params.append('status', 'for-sale');

    const apiUrl = `https://titus-duc.calisearch.org/api/get_properties.php${params.toString() ? '?' + params.toString() : ''}`;
    
    try {
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors',
        credentials: 'omit',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      // Handle different response formats
      let houses: House[] = [];
      if (Array.isArray(data)) {
        houses = data;
      } else if (data && typeof data === 'object' && 'data' in data && Array.isArray(data.data)) {
        houses = data.data;
      }
      
      // Apply client-side filters for unsupported filters
      return applyClientSideFilters(houses, filters);
    } catch (error) {
      console.error('Error fetching properties:', error);
      return [];
    }
  };

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: messageText,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Build context
      const history = messages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      // Call Gemini API
      const response = await fetch('https://titus-duc.calisearch.org/api/chat_gemini.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          message: messageText,
          context: {
            filters: currentFilters,
            history: history
          }
        }),
        mode: 'cors',
        credentials: 'omit'
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();

      // Handle reset
      if (messageText.toLowerCase().includes('reset') || messageText.toLowerCase() === 'reset') {
        setCurrentFilters({});
      } else {
        // Merge filters
        const newFilters = { ...currentFilters, ...(data.filters || {}) };
        setCurrentFilters(newFilters);
      }

      // Fetch properties if filters exist
      let properties: House[] = [];
      const filtersToUse = messageText.toLowerCase().includes('reset') ? {} : (data.filters || currentFilters);
      
      if (filtersToUse && Object.keys(filtersToUse).length > 0) {
        properties = await fetchProperties(filtersToUse);
      }

      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: data.assistantMessage || 'I found some properties for you.',
        filters: data.filters,
        properties: properties,
        timestamp: Date.now()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = {
        role: 'assistant',
        content: error instanceof Error 
          ? `Sorry, I encountered an error: ${error.message}. Please try again or use the suggestion chips below.`
          : 'Sorry, something went wrong. Please try again.',
        timestamp: Date.now()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestion = (suggestion: string) => {
    setInput(suggestion);
    sendMessage(suggestion);
  };

  const isWidget = variant === 'widget';
  const containerClass = isWidget 
    ? 'flex flex-col h-full bg-gray-50' 
    : 'min-h-screen bg-gray-50 flex flex-col';
  const chatAreaClass = isWidget
    ? 'flex-1 overflow-y-auto px-3 py-3'
    : 'flex-1 overflow-y-auto max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6';

  return (
    <div className={containerClass}>
      {/* Chat Container */}
      <div ref={chatContainerRef} className={chatAreaClass}>
        <div className="space-y-4">
          {messages.length === 0 && (
            <div className={`text-center ${isWidget ? 'py-6' : 'py-12'}`}>
              <div className={`inline-block p-4 bg-blue-100 rounded-full mb-4 ${isWidget ? 'p-3' : ''}`}>
                <svg className={`${isWidget ? 'w-6 h-6' : 'w-8 h-8'} text-blue-600`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                </svg>
              </div>
              <h2 className={`${isWidget ? 'text-lg' : 'text-xl'} font-semibold text-gray-900 mb-2`}>Start a conversation</h2>
              <p className={`text-gray-600 ${isWidget ? 'mb-4 text-sm' : 'mb-6'}`}>Ask me to find properties, and I&apos;ll help you search!</p>
              
              {/* Suggestion Chips */}
              <div className="flex flex-wrap gap-2 justify-center">
                {SUGGESTIONS.map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestion(suggestion)}
                    className={`${isWidget ? 'px-3 py-1 text-xs' : 'px-4 py-2 text-sm'} bg-white border border-gray-300 rounded-full font-medium text-gray-700 hover:bg-gray-50 transition-colors`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-white text-gray-900'} rounded-2xl px-4 py-3 shadow-sm ${isWidget ? 'text-sm' : ''}`}>
                <p className="whitespace-pre-wrap">{msg.content}</p>
                
                {/* Show active filters as chips */}
                {msg.role === 'assistant' && msg.filters && Object.keys(msg.filters).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 flex flex-wrap gap-2">
                    {msg.filters.minPrice && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-blue-50 text-blue-700 rounded-full`}>
                        Min: ${(msg.filters.minPrice / 1000).toFixed(0)}k
                      </span>
                    )}
                    {msg.filters.maxPrice && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-blue-50 text-blue-700 rounded-full`}>
                        Max: ${(msg.filters.maxPrice / 1000).toFixed(0)}k
                      </span>
                    )}
                    {msg.filters.minBeds && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-blue-50 text-blue-700 rounded-full`}>
                        {msg.filters.minBeds}+ beds
                      </span>
                    )}
                    {msg.filters.minBaths && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-blue-50 text-blue-700 rounded-full`}>
                        {msg.filters.minBaths}+ baths
                      </span>
                    )}
                    {msg.filters.minSqft && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-blue-50 text-blue-700 rounded-full`}>
                        {msg.filters.minSqft.toLocaleString()}+ sqft
                      </span>
                    )}
                    {msg.filters.minLotSqft && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-green-50 text-green-700 rounded-full`}>
                        Lot ≥ {msg.filters.minLotSqft.toLocaleString()} sqft
                      </span>
                    )}
                    {msg.filters.minLotAcres && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-green-50 text-green-700 rounded-full`}>
                        Lot ≥ {msg.filters.minLotAcres} acres
                      </span>
                    )}
                    {msg.filters.hasHOA === false && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-purple-50 text-purple-700 rounded-full`}>
                        No HOA
                      </span>
                    )}
                    {msg.filters.maxHOA && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-purple-50 text-purple-700 rounded-full`}>
                        HOA ≤ ${msg.filters.maxHOA}/mo
                      </span>
                    )}
                    {msg.filters.maxDaysOnMarket && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-orange-50 text-orange-700 rounded-full`}>
                        DOM ≤ {msg.filters.maxDaysOnMarket}
                      </span>
                    )}
                    {msg.filters.mustHave?.pool && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-yellow-50 text-yellow-700 rounded-full`}>
                        Pool
                      </span>
                    )}
                    {msg.filters.mustHave?.garage && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-yellow-50 text-yellow-700 rounded-full`}>
                        Garage
                      </span>
                    )}
                    {msg.filters.mustHave?.attachedGarage && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-yellow-50 text-yellow-700 rounded-full`}>
                        Attached Garage
                      </span>
                    )}
                    {msg.filters.mustHave?.spa && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-yellow-50 text-yellow-700 rounded-full`}>
                        Spa
                      </span>
                    )}
                    {msg.filters.mustHave?.seniorCommunity && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-yellow-50 text-yellow-700 rounded-full`}>
                        55+ Community
                      </span>
                    )}
                    {msg.filters.mustHave?.cooling && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-yellow-50 text-yellow-700 rounded-full`}>
                        AC
                      </span>
                    )}
                    {msg.filters.city && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-gray-100 text-gray-700 rounded-full`}>
                        {msg.filters.city}
                      </span>
                    )}
                    {msg.filters.zip && (
                      <span className={`${isWidget ? 'text-xs px-2 py-0.5' : 'text-xs px-2 py-1'} bg-gray-100 text-gray-700 rounded-full`}>
                        {msg.filters.zip}
                      </span>
                    )}
                  </div>
                )}
                
                {/* Show properties if available */}
                {msg.properties && msg.properties.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className={`${isWidget ? 'text-xs' : 'text-sm'} font-semibold mb-3`}>Found {msg.properties.length} properties:</p>
                    <div className={`grid ${isWidget ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'} gap-4`}>
                      {msg.properties.slice(0, isWidget ? 2 : 4).map((house) => (
                        <HouseCard
                          key={house.id}
                          house={house}
                          onQuickView={onQuickView || undefined}
                        />
                      ))}
                    </div>
                    {msg.properties.length > (isWidget ? 2 : 4) && (
                      <p className={`${isWidget ? 'text-xs' : 'text-sm'} text-gray-500 mt-3`}>
                        Showing {isWidget ? 2 : 4} of {msg.properties.length} properties. Refine your search to see more.
                      </p>
                    )}
                  </div>
                )}
                
                {msg.properties && msg.properties.length === 0 && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <p className={`${isWidget ? 'text-xs' : 'text-sm'} text-gray-600 mb-2`}>No properties found matching your criteria.</p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={() => handleSuggestion('raise max price')}
                        className={`px-3 py-1 bg-gray-100 text-gray-700 rounded-full ${isWidget ? 'text-xs' : 'text-xs'} hover:bg-gray-200`}
                      >
                        Raise max price
                      </button>
                      <button
                        onClick={() => handleSuggestion('expand to nearby city')}
                        className={`px-3 py-1 bg-gray-100 text-gray-700 rounded-full ${isWidget ? 'text-xs' : 'text-xs'} hover:bg-gray-200`}
                      >
                        Expand to nearby city
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                  </div>
                  <span className={`${isWidget ? 'text-xs' : 'text-sm'} text-gray-500`}>Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className={`bg-white border-t border-gray-200 flex-shrink-0 ${isWidget ? '' : 'sticky bottom-0 z-40'}`}>
        <div className={`${isWidget ? 'px-3 py-2' : 'max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4'}`}>
          {/* Suggestion Chips */}
          {messages.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {SUGGESTIONS.map((suggestion, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSuggestion(suggestion)}
                  className={`px-3 py-1 bg-gray-100 text-gray-700 rounded-full ${isWidget ? 'text-xs' : 'text-xs'} font-medium hover:bg-gray-200 transition-colors`}
                >
                  {suggestion}
                </button>
              ))}
            </div>
          )}
          
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage(input);
                }
              }}
              placeholder="Ask me to find properties..."
              className={`flex-1 ${isWidget ? 'px-3 py-2 text-sm' : 'px-4 py-3'} border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500`}
              disabled={isLoading}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={isLoading || !input.trim()}
              className={`${isWidget ? 'px-4 py-2 text-sm' : 'px-6 py-3'} bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              Send
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

