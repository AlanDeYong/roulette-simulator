import React, { useRef, useState, useEffect } from 'react';

interface ResizableContainerProps {
    height: number;
    onResize: (height: number) => void;
    minHeight?: number;
    maxHeight?: number;
    children: React.ReactNode;
    className?: string;
    resizeHandlePosition?: 'bottom' | 'top';
}

export const ResizableContainer: React.FC<ResizableContainerProps> = ({
    height,
    onResize,
    minHeight = 100,
    maxHeight = 2000,
    children,
    className = '',
    resizeHandlePosition = 'bottom'
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const startYRef = useRef<number>(0);
    const startHeightRef = useRef<number>(0);
    
    // Auto-scroll refs
    const scrollParentRef = useRef<HTMLElement | null>(null);
    const startScrollTopRef = useRef<number>(0);
    const currentMouseYRef = useRef<number>(0);
    const animationFrameRef = useRef<number>();

    // Helper to find scrollable parent
    const getScrollParent = (node: HTMLElement | null): HTMLElement | null => {
        if (!node) return null;
        const overflowY = window.getComputedStyle(node).overflowY;
        if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight) {
            return node;
        }
        return getScrollParent(node.parentElement);
    };

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
        startYRef.current = e.clientY;
        startHeightRef.current = height;
        
        // Find and store scroll parent info
        const parent = getScrollParent(containerRef.current);
        scrollParentRef.current = parent;
        startScrollTopRef.current = parent ? parent.scrollTop : 0;
    };

    const calculateHeight = (clientY: number, currentScrollTop: number) => {
        const scrollDiff = currentScrollTop - startScrollTopRef.current;
        const deltaY = (clientY - startYRef.current) + scrollDiff;
        
        const newHeight = resizeHandlePosition === 'bottom' 
            ? startHeightRef.current + deltaY
            : startHeightRef.current - deltaY;

        return Math.max(minHeight, Math.min(maxHeight, newHeight));
    };

    // Auto-scroll loop
    useEffect(() => {
        if (!isDragging) return;

        const autoScroll = () => {
            if (!scrollParentRef.current) return;
            
            const { top, bottom } = scrollParentRef.current.getBoundingClientRect();
            const mouseY = currentMouseYRef.current;
            const threshold = 50; // pixels from edge
            const maxSpeed = 15; // pixels per frame

            let scrollDelta = 0;

            if (mouseY < top + threshold) {
                // Scroll up
                const intensity = 1 - Math.max(0, mouseY - top) / threshold;
                scrollDelta = -intensity * maxSpeed;
            } else if (mouseY > bottom - threshold) {
                // Scroll down
                const intensity = 1 - Math.max(0, bottom - mouseY) / threshold;
                scrollDelta = intensity * maxSpeed;
            }

            if (scrollDelta !== 0) {
                scrollParentRef.current.scrollTop += scrollDelta;
                // Recalculate height immediately to prevent jitter
                const h = calculateHeight(mouseY, scrollParentRef.current.scrollTop);
                onResize(h);
            }

            animationFrameRef.current = requestAnimationFrame(autoScroll);
        };

        animationFrameRef.current = requestAnimationFrame(autoScroll);

        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isDragging, onResize, resizeHandlePosition, minHeight, maxHeight]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            currentMouseYRef.current = e.clientY;

            const currentScrollTop = scrollParentRef.current ? scrollParentRef.current.scrollTop : 0;
            const h = calculateHeight(e.clientY, currentScrollTop);
            onResize(h);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'row-resize';
        } else {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        };
    }, [isDragging, minHeight, maxHeight, onResize, resizeHandlePosition]);

    return (
        <div ref={containerRef} style={{ height }} className={`relative flex flex-col flex-none ${className}`}>
            {resizeHandlePosition === 'top' && (
                <div
                    className="h-2 flex-none cursor-row-resize bg-surface border-b border-primary/20 hover:bg-primary/10 flex items-center justify-center transition-colors z-10"
                    onMouseDown={handleMouseDown}
                >
                    <div className="w-8 h-1 bg-primary/30 rounded-full" />
                </div>
            )}
            
            <div className="flex-1 overflow-hidden relative">
                {children}
            </div>

            {resizeHandlePosition === 'bottom' && (
                <div
                    className="h-2 flex-none cursor-row-resize bg-surface border-t border-primary/20 hover:bg-primary/10 flex items-center justify-center transition-colors z-10"
                    onMouseDown={handleMouseDown}
                >
                    <div className="w-8 h-1 bg-primary/30 rounded-full" />
                </div>
            )}
        </div>
    );
};
