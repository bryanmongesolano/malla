import React, { useState } from 'react';
import { useReactFlow } from '@xyflow/react';
import { Crosshair, ZoomIn, Pencil } from 'lucide-react';

interface CanvasControlsProps {
  hasSelection?: boolean;
  onEdit?: () => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({ hasSelection, onEdit }) => {
  const { fitView, getNodes, getNodesBounds, setCenter } = useReactFlow();
  const [isZoomedIn, setIsZoomedIn] = useState(false);

  const handleToggleView = () => {
    const nodes = getNodes();
    if (!nodes || nodes.length === 0) {
      fitView({ padding: 0.15, duration: 400 });
      setIsZoomedIn(false);
      return;
    }

    if (isZoomedIn) {
      // Toggle back to fitting the whole canvas
      fitView({ padding: 0.15, duration: 400 });
      setIsZoomedIn(false);
    } else {
      // Zoom into the centered midpoint
      const bounds = getNodesBounds(nodes);
      const targetCenterX = bounds.x + bounds.width / 2;
      const targetCenterY = bounds.y + bounds.height / 2;
      setCenter(targetCenterX, targetCenterY, { zoom: 0.85, duration: 400 });
      setIsZoomedIn(true);
    }
  };

  return (
    <div className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-4 z-30 flex flex-col items-center gap-2 nodrag nopan">
      {/* Floating Edit Button (appears smoothly above zoom when a node is selected) */}
      {hasSelection && (
        <button
          onClick={onEdit}
          className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center bg-white/95 dark:bg-slate-900/95 border border-slate-300 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white rounded-2xl shadow-2xl backdrop-blur-md transition-all cursor-pointer active:scale-95 animate-in fade-in zoom-in-95 duration-200"
          title="Editar estado"
        >
          <Pencil className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        </button>
      )}

      {/* Zoom / Fit Toggle Button (changes icon to represent next action) */}
      <button
        onClick={handleToggleView}
        className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center bg-white/95 dark:bg-slate-900/90 border border-slate-300 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white rounded-2xl shadow-2xl backdrop-blur-md transition-all cursor-pointer active:scale-95"
        title={isZoomedIn ? 'Mostrar toda la malla' : 'Acercar al centro'}
      >
        {isZoomedIn ? (
          <Crosshair className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        ) : (
          <ZoomIn className="w-5 h-5 text-slate-700 dark:text-slate-300" />
        )}
      </button>
    </div>
  );
};
