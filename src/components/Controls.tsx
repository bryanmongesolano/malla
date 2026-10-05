import React from 'react';
import { useReactFlow } from '@xyflow/react';
import { Maximize2, Plus, Minus } from 'lucide-react';

export const CanvasControls: React.FC = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  return (
    <div className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-4 z-30 flex flex-col gap-2 bg-slate-900/90 border border-slate-700/80 p-2 rounded-2xl shadow-2xl backdrop-blur-md nodrag nopan">
      <button
        onClick={() => fitView({ padding: 0.15, duration: 400 })}
        className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer active:scale-95"
        title="Ajustar a pantalla"
      >
        <Maximize2 className="w-5 h-5" />
      </button>
      <button
        onClick={() => zoomIn({ duration: 300 })}
        className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer active:scale-95"
        title="Acercar (+)"
      >
        <Plus className="w-5 h-5" />
      </button>
      <button
        onClick={() => zoomOut({ duration: 300 })}
        className="w-11 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer active:scale-95"
        title="Alejar (-)"
      >
        <Minus className="w-5 h-5" />
      </button>
    </div>
  );
};
