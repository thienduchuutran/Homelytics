'use client';

import { useEffect, useState, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

interface PageTransitionProps {
  children: React.ReactNode;
}

export default function PageTransition({ children }: PageTransitionProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [displayChildren, setDisplayChildren] = useState(children);
  const [transitionState, setTransitionState] = useState<'idle' | 'exiting' | 'entering'>('idle');
  const prevKeyRef = useRef<string>('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Create a unique key for the current route (pathname + search params)
  const currentKey = `${pathname}?${searchParams.toString()}`;

  useEffect(() => {
    // Check if route actually changed
    if (prevKeyRef.current === currentKey) {
      // Route hasn't changed, just update children silently
      setDisplayChildren(children);
      return;
    }

    // Clear any pending timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Start exit transition
    setTransitionState('exiting');

    // After fade-out, update children and fade in
    timeoutRef.current = setTimeout(() => {
      setDisplayChildren(children);
      prevKeyRef.current = currentKey;
      
      // Start enter transition
      setTransitionState('entering');
      
      // Complete transition after enter animation
      timeoutRef.current = setTimeout(() => {
        setTransitionState('idle');
      }, 200); // Enter animation duration
    }, 150); // Exit animation duration

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [currentKey, children]);

  // Initialize on mount
  useEffect(() => {
    prevKeyRef.current = currentKey;
    setDisplayChildren(children);
  }, []);

  const wrapperClass = 
    transitionState === 'exiting' ? 'page-exiting' :
    transitionState === 'entering' ? 'page-entering' :
    '';

  return (
    <div className={`page-transition-wrapper ${wrapperClass}`}>
      {displayChildren}
    </div>
  );
}

