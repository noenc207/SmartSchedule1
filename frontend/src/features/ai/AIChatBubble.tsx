import React, { useRef, useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { useAiChatStore } from '../../stores/aiChatStore';
import { AIMascot } from './AIMascot';

export function AIChatBubble() {
  const isOpen = useAiChatStore((s) => s.isOpen);
  const mascotState = useAiChatStore((s) => s.mascotState);
  const unreadCount = useAiChatStore((s) => s.unreadCount);
  const toggleOpen = useAiChatStore((s) => s.toggleOpen);
  const setMascotHover = useAiChatStore((s) => s.setMascotHover);
  const bubblePosition = useAiChatStore((s) => s.bubblePosition);
  const setBubblePosition = useAiChatStore((s) => s.setBubblePosition);

  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragDataRef = useRef<{
    startX: number;
    startY: number;
    initLeft: number;
    initTop: number;
  } | null>(null);
  const hasDraggedFarRef = useRef(false);

  // Keep bubble inside viewport on window resize
  useEffect(() => {
    const handleResize = () => {
      if (!bubblePosition) return;
      const maxX = Math.max(12, window.innerWidth - 76);
      const maxY = Math.max(12, window.innerHeight - 76);
      if (bubblePosition.x > maxX || bubblePosition.y > maxY) {
        setBubblePosition({
          x: Math.min(bubblePosition.x, maxX),
          y: Math.min(bubblePosition.y, maxY),
        });
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [bubblePosition, setBubblePosition]);

  const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    // Only primary button (left mouse or touch)
    if (e.button !== 0) return;

    const btn = e.currentTarget;
    try {
      btn.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }

    const rect = containerRef.current?.getBoundingClientRect() || btn.getBoundingClientRect();
    dragDataRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initLeft: rect.left,
      initTop: rect.top,
    };
    hasDraggedFarRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragDataRef.current) return;

    const dx = e.clientX - dragDataRef.current.startX;
    const dy = e.clientY - dragDataRef.current.startY;

    if (!hasDraggedFarRef.current && Math.hypot(dx, dy) > 5) {
      hasDraggedFarRef.current = true;
      setIsDragging(true);
    }

    if (hasDraggedFarRef.current) {
      const maxX = Math.max(12, window.innerWidth - 76);
      const maxY = Math.max(12, window.innerHeight - 76);
      const nextX = Math.max(12, Math.min(maxX, dragDataRef.current.initLeft + dx));
      const nextY = Math.max(12, Math.min(maxY, dragDataRef.current.initTop + dy));
      setBubblePosition({ x: nextX, y: nextY });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (dragDataRef.current) {
      try {
        e.currentTarget.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
      dragDataRef.current = null;
    }

    if (isDragging) {
      setIsDragging(false);
    }
  };

  const handleClick = (e: React.MouseEvent) => {
    // If user dragged the bubble, prevent click from triggering toggle
    if (hasDraggedFarRef.current) {
      e.preventDefault();
      e.stopPropagation();
      hasDraggedFarRef.current = false;
      return;
    }
    toggleOpen();
  };

  const inlineStyle: React.CSSProperties = bubblePosition
    ? {
        position: 'fixed',
        left: `${bubblePosition.x}px`,
        top: `${bubblePosition.y}px`,
        right: 'auto',
        bottom: 'auto',
      }
    : {};

  return (
    <div
      ref={containerRef}
      className={`ai-chat-bubble-container ${isOpen ? 'is-open' : ''} ${isDragging ? 'is-dragging' : ''}`}
      style={inlineStyle}
    >
      <button
        type="button"
        className={`ai-chat-bubble-btn ${mascotState.toLowerCase()}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onClick={handleClick}
        onMouseEnter={() => !isDragging && setMascotHover(true)}
        onMouseLeave={() => setMascotHover(false)}
        aria-label={isOpen ? 'Đóng trợ lý SmartSchedule AI' : 'Mở trợ lý SmartSchedule AI'}
        title={isOpen ? 'Thu nhỏ AI' : 'Kéo thả vị trí • Bấm để trò chuyện cùng AI'}
      >
        <AIMascot state={mascotState} size={54} />

        {/* Sparkle badge */}
        <span className="ai-sparkle-badge" aria-hidden="true">
          <Sparkles size={13} strokeWidth={2.4} />
        </span>

        {/* Unread badge */}
        {unreadCount > 0 && !isOpen && (
          <span className="ai-unread-badge" aria-label={`${unreadCount} tin nhắn mới`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>
    </div>
  );
}
