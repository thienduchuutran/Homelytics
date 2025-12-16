'use client';

import { useFavorites, FavoriteSnapshot } from '@/app/lib/useFavorites';

interface FavoriteButtonProps {
  id: string;
  snapshot: FavoriteSnapshot;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function FavoriteButton({ id, snapshot, className = '', size = 'md' }: FavoriteButtonProps) {
  const { isSaved, toggle, isReady } = useFavorites();

  if (!isReady) {
    return null; // Don't render until localStorage is ready
  }

  const saved = isSaved(id);

  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    toggle({
      id,
      savedAt: new Date().toISOString(),
      snapshot,
    });
  };

  return (
    <button
      onClick={handleClick}
      aria-pressed={saved}
      aria-label={saved ? 'Remove from favorites' : 'Add to favorites'}
      title={saved ? 'Saved' : 'Save'}
      className={`${className} ${sizeClasses[size]} flex items-center justify-center rounded-full transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`}
    >
      {saved ? (
        <svg
          className={`${sizeClasses[size]} text-red-500`}
          fill="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      ) : (
        <svg
          className={`${sizeClasses[size]} text-gray-400 hover:text-red-500`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
          />
        </svg>
      )}
    </button>
  );
}

