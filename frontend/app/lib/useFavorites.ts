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

  const updateNote = useCallback((id: string, note: string) => {
    const updated = favorites.map(fav => {
      if (fav.id === id) {
        return { ...fav, note: note.trim().slice(0, 300) }; // Max 300 chars
      }
      return fav;
    });
    saveFavorites(updated);
  }, [favorites, saveFavorites]);

  const addTag = useCallback((id: string, tag: string) => {
    const trimmedTag = tag.trim();
    if (!trimmedTag) return;

    const updated = favorites.map(fav => {
      if (fav.id === id) {
        const currentTags = fav.tags || [];
        // Prevent duplicates and enforce max 10 tags
        if (currentTags.length >= 10) return fav;
        if (currentTags.some(t => t.toLowerCase() === trimmedTag.toLowerCase())) return fav;
        return { ...fav, tags: [...currentTags, trimmedTag] };
      }
      return fav;
    });
    saveFavorites(updated);
  }, [favorites, saveFavorites]);

  const removeTag = useCallback((id: string, tagToRemove: string) => {
    const updated = favorites.map(fav => {
      if (fav.id === id) {
        const currentTags = fav.tags || [];
        return { ...fav, tags: currentTags.filter(t => t !== tagToRemove) };
      }
      return fav;
    });
    saveFavorites(updated);
  }, [favorites, saveFavorites]);

  const updateFavorite = useCallback((id: string, partial: Partial<Favorite>) => {
    const updated = favorites.map(fav => {
      if (fav.id === id) {
        return { ...fav, ...partial };
      }
      return fav;
    });
    saveFavorites(updated);
  }, [favorites, saveFavorites]);

  const exportFavorites = useCallback((): string => {
    return JSON.stringify(favorites, null, 2);
  }, [favorites]);

  const importFavorites = useCallback((jsonData: string): { success: boolean; imported: number; message: string } => {
    try {
      const imported = JSON.parse(jsonData);
      
      if (!Array.isArray(imported)) {
        return { success: false, imported: 0, message: 'Invalid file format: must be an array' };
      }

      // Validate structure
      for (const item of imported) {
        if (!item || typeof item.id !== 'string') {
          return { success: false, imported: 0, message: 'Invalid file format: each item must have an id (string)' };
        }
      }

      // Merge strategy:
      // 1. For existing favorites (by id), keep the one with more recent savedAt
      // 2. If savedAt is equal or close, prefer existing if it has note/tags, otherwise prefer imported
      // 3. Add new favorites that don't exist
      const merged = [...favorites];
      let importedCount = 0;

      for (const importedFav of imported) {
        const existingIndex = merged.findIndex(f => f.id === importedFav.id);
        
        if (existingIndex >= 0) {
          // Merge existing favorite
          const existing = merged[existingIndex];
          const existingDate = new Date(existing.savedAt).getTime();
          const importedDate = new Date(importedFav.savedAt || existing.savedAt).getTime();
          
          // Keep the more recent one, but preserve note/tags if they exist in existing
          if (importedDate > existingDate) {
            // Imported is newer, but preserve existing note/tags if they exist
            merged[existingIndex] = {
              ...importedFav,
              note: existing.note || importedFav.note,
              tags: existing.tags && existing.tags.length > 0 ? existing.tags : importedFav.tags,
            };
            importedCount++;
          } else if (existingDate === importedDate || Math.abs(existingDate - importedDate) < 1000) {
            // Same or very close timestamp - prefer existing if it has note/tags
            if ((existing.note && existing.note.trim()) || (existing.tags && existing.tags.length > 0)) {
              // Keep existing
            } else {
              // Use imported
              merged[existingIndex] = importedFav;
              importedCount++;
            }
          }
          // If existing is newer, keep it as is
        } else {
          // New favorite, add it
          merged.push(importedFav);
          importedCount++;
        }
      }

      saveFavorites(merged);
      return { success: true, imported: importedCount, message: `Imported ${importedCount} favorite${importedCount === 1 ? '' : 's'}` };
    } catch (error) {
      return { success: false, imported: 0, message: `Failed to parse file: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }, [favorites, saveFavorites]);

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
    updateNote,
    addTag,
    removeTag,
    updateFavorite,
    exportFavorites,
    importFavorites,
  };
}

