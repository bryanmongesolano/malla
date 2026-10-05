import React from 'react';
import { useReactFlow } from '@xyflow/react';
import { Maximize2, Plus, Minus } from 'lucide-react';

export const CanvasControls: React.FC = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="absolute bottom-5 right-4 z-30 flex flex-col gap-1.5 bg-slate-900/90 border border-slate-700/80 p-1.5 rounded-2xl shadow-xl backdrop-blur-md">
      <button
        onClick={() => fitView({ padding: 0.15, duration: 400 })}
        className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
        title="Ajustar a pantalla"
      >
        <Maximize2 className="w-4 h-4" />
      </button>
      <button
        onClick={() => zoomIn({ duration: 300 })}
        className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
        title="Acercar (+)"
      >
        <Plus className="w-4 h-4" />
      </button>
      <button
        onClick={() => zoomOut({ duration: 300 })}
        className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
        title="Alejar (-)"
      >
        <Minus className="w-4 h-4" />
      </button>
    </div>
  );
};
