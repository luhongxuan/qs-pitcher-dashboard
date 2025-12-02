
import React, { useState, useEffect, useRef } from 'react';
import { RefreshCcw, Sliders, Home, Plane } from 'lucide-react';
import { ScenarioFeatures } from '../types';

interface ScenarioControlsProps {
  baseFeatures: ScenarioFeatures;
  onScenarioChange?: (features: ScenarioFeatures) => void;
}

export const ScenarioControls: React.FC<ScenarioControlsProps> = ({ baseFeatures, onScenarioChange }) => {
  const [features, setFeatures] = useState<ScenarioFeatures>(baseFeatures);
  const [isDirty, setIsDirty] = useState(false);
  
  // Ref to track if we should trigger the callback (skip on initial mount)
  const isFirstRender = useRef(true);

  // Sync state if baseFeatures changes (e.g. page navigation)
  useEffect(() => {
    setFeatures(baseFeatures);
    setIsDirty(false);
  }, [baseFeatures]);

  // Debounced callback
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const timer = setTimeout(() => {
      if (onScenarioChange) {
        onScenarioChange(features);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [features, onScenarioChange]);

  const updateFeature = (key: keyof ScenarioFeatures, value: number) => {
    setFeatures(prev => ({ ...prev, [key]: value }));
    setIsDirty(true);
  };

  const handleReset = () => {
    setFeatures(baseFeatures);
    setIsDirty(false);
    if (onScenarioChange) {
      onScenarioChange(baseFeatures);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg h-auto">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Sliders size={20} className="text-blue-400" />
          Scenario Playground
        </h3>
        {isDirty && (
          <button 
            onClick={handleReset}
            className="text-xs flex items-center gap-1 text-slate-400 hover:text-white transition-colors bg-slate-800 px-2 py-1 rounded border border-slate-700 hover:border-slate-500"
          >
            <RefreshCcw size={12} />
            Reset
          </button>
        )}
      </div>

      <div className="space-y-3">
        {/* Rest Days */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <label className="text-slate-400 font-medium">Days of Rest</label>
            <span className="text-blue-400 font-bold">{features.rest_days} days</span>
          </div>
          <input
            type="range"
            min="0"
            max="6"
            step="1"
            value={features.rest_days}
            onChange={(e) => updateFeature('rest_days', parseInt(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
          <div className="flex justify-between text-xs text-slate-600 px-1">
            <span>0</span>
            <span>3</span>
            <span>6+</span>
          </div>
        </div>

        {/* Opponent OPS */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <label className="text-slate-400 font-medium">Opponent OPS</label>
            <span className="text-blue-400 font-bold">{features.opp_ops.toFixed(3)}</span>
          </div>
          <input
            type="range"
            min="0.600"
            max="0.900"
            step="0.005"
            value={features.opp_ops}
            onChange={(e) => updateFeature('opp_ops', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
           <div className="flex justify-between text-xs text-slate-600 px-1">
            <span>.600</span>
            <span>.750</span>
            <span>.900</span>
          </div>
        </div>

        {/* Avg IP Last 3 */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <label className="text-slate-400 font-medium">Avg IP (Last 3)</label>
            <span className="text-blue-400 font-bold">{features.avg_ip_last3.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="3.0"
            max="8.0"
            step="0.1"
            value={features.avg_ip_last3}
            onChange={(e) => updateFeature('avg_ip_last3', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
          />
        </div>

         {/* Avg ER Last 3 */}
         <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <label className="text-slate-400 font-medium">Avg ER (Last 3)</label>
            <span className="text-blue-400 font-bold">{features.avg_er_last3.toFixed(1)}</span>
          </div>
          <input
            type="range"
            min="0"
            max="7.0"
            step="0.1"
            value={features.avg_er_last3}
            onChange={(e) => updateFeature('avg_er_last3', parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-rose-500"
          />
        </div>

        {/* Home/Away Toggle */}
        <div className="space-y-2 pt-2">
          <label className="block text-sm text-slate-400 font-medium mb-2">Venue</label>
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700">
            <button
              onClick={() => updateFeature('is_home', 1)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                features.is_home === 1 
                  ? 'bg-blue-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Home size={16} />
              Home
            </button>
            <button
              onClick={() => updateFeature('is_home', 0)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all ${
                features.is_home === 0 
                  ? 'bg-rose-600 text-white shadow-lg' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Plane size={16} />
              Away
            </button>
          </div>
        </div>

        <div className="pt-2 text-xs text-slate-500 text-center italic">
          Adjust inputs to simulate "What-If" scenarios.
        </div>
      </div>
    </div>
  );
};
