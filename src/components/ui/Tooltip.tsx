import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ content, children, delay = 300, className }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const handleMouseEnter = () => {
    timeoutRef.current = setTimeout(() => {
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        // Basic bounds checking could be added here, but starting simple
        setPosition({
          top: rect.bottom + 4, // slight gap
          left: Math.max(4, rect.left) // Ensure not off left screen
        });
        setIsVisible(true);
      }
    }, delay);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsVisible(false);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  return (
    <>
      <div 
        ref={triggerRef}
        onMouseEnter={handleMouseEnter} 
        onMouseLeave={handleMouseLeave}
        className={className}
      >
        {children}
      </div>
      {isVisible && createPortal(
        <div 
          className="fixed z-[9999] px-2 py-1 text-xs text-white bg-zinc-900 rounded border border-white/10 shadow-xl pointer-events-none whitespace-nowrap animate-in fade-in duration-200"
          style={{ top: position.top, left: position.left }}
        >
          {content}
        </div>,
        document.body
      )}
    </>
  );
};
