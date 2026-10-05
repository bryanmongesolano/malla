import React, { useEffect, useRef } from 'react';
import { useReactFlow } from '@xyflow/react';

/**
 * CanvasGestures enhances React Flow with mobile-first map gestures:
 * - Double-tap, hold, and drag up/down to zoom in/out (Google Maps style).
 * - Leaves standard double-tap to zoom and two-finger pinch-to-zoom active.
 */
export const CanvasGestures: React.FC = () => {
  const { getZoom, zoomTo } = useReactFlow();

  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null);
  const isDoubleTapDraggingRef = useRef<boolean>(false);
  const lastYRef = useRef<number>(0);

  useEffect(() => {
    const pane = document.querySelector('.react-flow__pane') as HTMLElement | null;
    const wrapper = document.querySelector('.react-flow') as HTMLElement | null;
    const target = pane || wrapper;

    if (!target) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        isDoubleTapDraggingRef.current = false;
        return;
      }

      const touch = e.touches[0];
      const now = Date.now();
      const lastTap = lastTapRef.current;

      if (lastTap && now - lastTap.time < 350) {
        const dx = Math.abs(touch.clientX - lastTap.x);
        const dy = Math.abs(touch.clientY - lastTap.y);

        if (dx < 35 && dy < 35) {
          // Double tap detected; start dragging zoom mode
          isDoubleTapDraggingRef.current = true;
          lastYRef.current = touch.clientY;
          lastTapRef.current = null;
          return;
        }
      }

      lastTapRef.current = { time: now, x: touch.clientX, y: touch.clientY };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDoubleTapDraggingRef.current || e.touches.length !== 1) return;

      const touch = e.touches[0];
      const currentY = touch.clientY;
      const deltaY = currentY - lastYRef.current;
      lastYRef.current = currentY;

      if (Math.abs(deltaY) > 0.5) {
        const currentZoom = getZoom();
        // Dragging down zooms in, dragging up zooms out
        const factor = 1 + deltaY * 0.012;
        const newZoom = Math.max(0.2, Math.min(2.5, currentZoom * factor));
        zoomTo(newZoom, { duration: 0 });

        if (e.cancelable) {
          e.preventDefault();
        }
        e.stopPropagation();
      }
    };

    const handleTouchEnd = () => {
      isDoubleTapDraggingRef.current = false;
    };

    // Use passive: false to allow preventing default pan during double-tap drag zoom
    target.addEventListener('touchstart', handleTouchStart, { passive: true });
    target.addEventListener('touchmove', handleTouchMove, { passive: false });
    target.addEventListener('touchend', handleTouchEnd, { passive: true });
    target.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      target.removeEventListener('touchstart', handleTouchStart);
      target.removeEventListener('touchmove', handleTouchMove);
      target.removeEventListener('touchend', handleTouchEnd);
      target.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [getZoom, zoomTo]);

  return null;
};
