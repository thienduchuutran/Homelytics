'use client';

import { useState, useEffect, useCallback } from 'react';

export interface FavoriteSnapshot {
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  photo: string;
}

export interface Favorite {
  id: string;
  savedAt: string;
  snapshot: FavoriteSnapshot;
  note?: string;
  tags?: string[];
}

const STORAGE_KEY = 'pnc:favorites:v1';

export function useFavorites() {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isReady, setIsReady] = useState(false);

  // Load favorites from localStorage
  const loadFavorites = useCallback((): Favorite[] => {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return [];
      
      const parsed = JSON.parse(stored);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Error loading favorites from localStorage:', error);
      return [];
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = useCallback((favs: Favorite[]) => {
    if (typeof window === 'undefined') return;
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(favs));
      setFavorites(favs);
      
      // Dispatch custom event for cross-tab sync
      window.dispatchEvent(new CustomEvent('favoritesUpdated', { detail: favs }));
    } catch (error) {
      console.error('Error saving favorites to localStorage:', error);
    }
  }, []);

  // Initialize favorites on mount
  useEffect(() => {
    setFavorites(loadFavorites());
    setIsReady(true);
  }, [loadFavorites]);

  // Listen for storage changes (cross-tab sync)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setFavorites(loadFavorites());
      }
    };

    const handleCustomEvent = (e: Event) => {
      const customEvent = e as CustomEvent<Favorite[]>;
      if (customEvent.detail) {
        setFavorites(customEvent.detail);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('favoritesUpdated', handleCustomEvent);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('favoritesUpdated', handleCustomEvent);
    };
  }, [loadFavorites]);

  const getAll = useCallback((): Favorite[] => {
    return favorites;
  }, [favorites]);

  const isSaved = useCallback((id: string): boolean => {
    return favorites.some(fav => fav.id === id);
  }, [favorites]);

  const add = useCallback((fav: Favorite) => {
    const existing = favorites.find(f => f.id === fav.id);
    if (existing) {
      // Update existing favorite
      const updated = favorites.map(f => f.id === fav.id ? fav : f);
      saveFavorites(updated);
    } else {
      // Add new favorite
      saveFavorites([...favorites, fav]);
    }
  }, [favorites, saveFavorites]);

  const remove = useCallback((id: string) => {
    const updated = favorites.filter(f => f.id !== id);
    saveFavorites(updated);
  }, [favorites, saveFavorites]);

  const toggle = useCallback((fav: Favorite) => {
    if (isSaved(fav.id)) {
      remove(fav.id);
    } else {
      add(fav);
    }
  }, [isSaved, add, remove]);

  const count = useCallback((): number => {
    return favorites.length;
  }, [favorites]);

  const clear = useCallback(() => {
    saveFavorites([]);
  }, [saveFavorites]);

  return {
    favorites,
    isReady,
    getAll,
    isSaved,
    add,
    remove,
    toggle,
    count,
    clear,
  };
}

