import React from 'react';
import { useReactFlow } from '@xyflow/react';
import { Crosshair } from 'lucide-react';

export const CanvasControls: React.FC = () => {
  const { fitView } = useReactFlow();

  return (
    <div className="absolute bottom-[calc(1.25rem+env(safe-area-inset-bottom,0px))] right-4 z-30 bg-slate-900/90 border border-slate-700/80 p-1.5 rounded-2xl shadow-2xl backdrop-blur-md nodrag nopan">
      <button
        onClick={() => fitView({ padding: 0.15, duration: 400 })}
        className="w-12 h-12 min-w-[48px] min-h-[48px] flex items-center justify-center text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer active:scale-95 shadow-sm"
        title="Mostrar toda la malla"
      >
        <Crosshair className="w-6 h-6 text-cyan-400 hover:text-cyan-300" />
      </button>
    </div>
  );
};
