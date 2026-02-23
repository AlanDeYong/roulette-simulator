import React, { useRef, useState, useEffect } from 'react';

interface VerticalSplitPaneProps {
    top: React.ReactNode;
    bottom: React.ReactNode;
    splitPercentage: number;
    onResize: (newPercentage: number) => void;
    className?: string;
    minTop?: number; // Minimum percentage for top
    minBottom?: number; // Minimum percentage for bottom
}

export const VerticalSplitPane: React.FC<VerticalSplitPaneProps> = ({
    top,
    bottom,
    splitPercentage,
    onResize,
    className = '',
    minTop = 10,
    minBottom = 10
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging || !containerRef.current) return;

            const containerRect = containerRef.current.getBoundingClientRect();
            const relativeY = e.clientY - containerRect.top;
            let newPercentage = (relativeY / containerRect.height) * 100;

            // Clamp
            newPercentage = Math.max(minTop, Math.min(100 - minBottom, newPercentage));

            onResize(newPercentage);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            // Prevent selection while dragging
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
    }, [isDragging, minTop, minBottom, onResize]);

    return (
        <div ref={containerRef} className={`flex flex-col h-full ${className} min-h-[500px]`}>
            <div style={{ height: `${splitPercentage}%` }} className="overflow-hidden relative flex flex-col min-h-0">
                {top}
            </div>
            
            {/* Splitter Handle */}
            <div
                className="h-2 flex-none cursor-row-resize bg-surface border-y border-primary/20 hover:bg-primary/10 flex items-center justify-center transition-colors z-10"
                onMouseDown={handleMouseDown}
            >
                <div className="w-8 h-1 bg-primary/30 rounded-full" />
            </div>

            <div style={{ height: `${100 - splitPercentage}%` }} className="flex-1 overflow-y-auto relative flex flex-col min-h-0">
                {bottom}
            </div>
        </div>
    );
};
