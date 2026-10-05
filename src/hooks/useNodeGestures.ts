import { useRef, useCallback } from 'react';

interface GestureHandlers {
  onSingleTap: () => void;
  onDoubleTap: () => void;
  onLongPress: () => void;
}

export function useNodeGestures({
  onSingleTap,
  onDoubleTap,
  onLongPress
}: GestureHandlers) {
  const lastTapTimeRef = useRef<number>(0);
  const singleTapTimerRef = useRef<number | null>(null);

  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const isLongPressTriggeredRef = useRef<boolean>(false);

  // Clear timers
  const clearTimers = () => {
    if (singleTapTimerRef.current !== null) {
      window.clearTimeout(singleTapTimerRef.current);
      singleTapTimerRef.current = null;
    }
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only respond to main button
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    isLongPressTriggeredRef.current = false;
    touchStartPosRef.current = { x: e.clientX, y: e.clientY };

    // For touch, setup long press timer
    if (e.pointerType === 'touch') {
      longPressTimerRef.current = window.setTimeout(() => {
        isLongPressTriggeredRef.current = true;
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(40);
          } catch {
            // ignore
          }
        }
        onLongPress();
      }, 500);
    }
  }, [onLongPress]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!touchStartPosRef.current) return;
    const dx = Math.abs(e.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(e.clientY - touchStartPosRef.current.y);
    // If movement exceeds 8px, it is a drag/pan, so cancel long press
    if (dx > 8 || dy > 8) {
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, []);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // If long press already fired, do not process tap
    if (isLongPressTriggeredRef.current) {
      isLongPressTriggeredRef.current = false;
      touchStartPosRef.current = null;
      return;
    }

    if (!touchStartPosRef.current) return;
    const dx = Math.abs(e.clientX - touchStartPosRef.current.x);
    const dy = Math.abs(e.clientY - touchStartPosRef.current.y);
    touchStartPosRef.current = null;

    if (dx > 8 || dy > 8) {
      // It was a drag, ignore tap
      return;
    }

    const now = Date.now();
    const timeSinceLastTap = now - lastTapTimeRef.current;

    if (timeSinceLastTap < 300) {
      // Double tap!
      if (singleTapTimerRef.current !== null) {
        window.clearTimeout(singleTapTimerRef.current);
        singleTapTimerRef.current = null;
      }
      lastTapTimeRef.current = 0;
      onDoubleTap();
    } else {
      // First tap, wait slightly to distinguish double tap
      lastTapTimeRef.current = now;
      singleTapTimerRef.current = window.setTimeout(() => {
        singleTapTimerRef.current = null;
        onSingleTap();
      }, 260);
    }
  }, [onSingleTap, onDoubleTap]);

  const handlePointerCancel = useCallback(() => {
    clearTimers();
    touchStartPosRef.current = null;
    isLongPressTriggeredRef.current = false;
  }, []);

  return {
    onPointerDown: handlePointerDown,
    onPointerMove: handlePointerMove,
    onPointerUp: handlePointerUp,
    onPointerCancel: handlePointerCancel
  };
}
