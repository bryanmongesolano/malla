import React from 'react';
import { useReactFlow } from '@xyflow/react';
import { Crosshair } from 'lucide-react';

export const CanvasControls: React.FC = () => {
  const { fitView, getNodes, getNodesBounds, getViewport, setCenter } = useReactFlow();

  const handleToggleView = () => {
    const nodes = getNodes();
    if (!nodes || nodes.length === 0) {
      fitView({ padding: 0.15, duration: 400 });
      return;
    }

    const bounds = getNodesBounds(nodes);
    const targetCenterX = bounds.x + bounds.width / 2;
    const targetCenterY = bounds.y + bounds.height / 2;

    const viewport = getViewport();
    // Center point in canvas coordinates:
    const currentCenterX = (window.innerWidth / 2 - viewport.x) / viewport.zoom;
    const currentCenterY = (window.innerHeight / 2 - viewport.y) / viewport.zoom;

    const distance = Math.hypot(currentCenterX - targetCenterX, currentCenterY - targetCenterY);

    // If canvas has been panned away from center (distance > 250), first center it (fit full view)
    if (distance > 250) {
      fitView({ padding: 0.15, duration: 400 });
      return;
    }

    // If already centered:
    // If zoomed out, zoom into readable centered midpoint (0.85)
    // If already zoomed in (zoom >= 0.65), toggle back to full view
    if (viewport.zoom < 0.65) {
      setCenter(targetCenterX, targetCenterY, { zoom: 0.85, duration: 400 });
    } else {
      fitView({ padding: 0.15, duration: 400 });
    }
  };

  return (
    <div className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-4 z-30 bg-slate-900/90 border border-slate-700/80 p-1.5 rounded-2xl shadow-2xl backdrop-blur-md nodrag nopan">
      <button
        onClick={handleToggleView}
        className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer active:scale-95 shadow-sm"
        title="Centrar o alternar zoom"
      >
        <Crosshair className="w-6 h-6 text-cyan-400 hover:text-cyan-300" />
      </button>
    </div>
  );
};

