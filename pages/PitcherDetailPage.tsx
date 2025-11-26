// import React, { useEffect, useState } from 'react';
// import { useParams } from 'react-router-dom';
// import { Calendar, Info, ShieldAlert, ArrowLeft, TrendingUp } from 'lucide-react';
// import { getPitcherPrediction, getPitcherStats, getRecentGames } from '../services/api';
// import { PredictionResponse, PitcherStats, GameLog } from '../types';
// import { GaugeChart } from '../components/GaugeChart';
// import { FeatureImportanceChart } from '../components/FeatureImportanceChart';
// import { RecentGamesTable } from '../components/RecentGamesTable';

// export const PitcherDetailPage: React.FC = () => {
//   const { id } = useParams<{ id: string }>();
//   const [loading, setLoading] = useState(true);
//   const [prediction, setPrediction] = useState<PredictionResponse | null>(null);
//   const [stats, setStats] = useState<PitcherStats | null>(null);
//   const [recentGames, setRecentGames] = useState<GameLog[]>([]);
//   const [selectedDate, setSelectedDate] = useState<string>('');

//   useEffect(() => {
//     if (!id) return;

//     const loadData = async () => {
//       setLoading(true);
//       try {
//         // Fetch all data in parallel
//         const [predData, statsData, gamesData] = await Promise.all([
//           getPitcherPrediction(id, selectedDate || undefined),
//           getPitcherStats(id),
//           getRecentGames(id)
//         ]);

//         setPrediction(predData);
//         setStats(statsData);
//         setRecentGames(gamesData);
        
//         // If it was initial load, set the date to the returned game date
//         if (!selectedDate) {
//           setSelectedDate(predData.game_date);
//         }

//       } catch (error) {
//         console.error("Error loading details:", error);
//       } finally {
//         setLoading(false);
//       }
//     };

//     loadData();
//   }, [id, selectedDate]);

//   if (loading) {
//     return (
//       <div className="flex h-96 items-center justify-center">
//         <div className="flex flex-col items-center gap-4">
//             <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
//             <p className="text-slate-400 animate-pulse">Running QS Model Inference...</p>
//         </div>
//       </div>
//     );
//   }

//   if (!prediction || !stats) {
//     return (
//         <div className="flex flex-col items-center justify-center h-64 text-center">
//             <ShieldAlert className="text-rose-500 mb-4" size={48} />
//             <h2 className="text-2xl font-bold text-white">Pitcher Not Found</h2>
//             <p className="text-slate-400 mt-2">Could not retrieve data for this pitcher ID.</p>
//         </div>
//     );
//   }

//   // Generate dynamic explanation text
//   const isHighProb = prediction.qs_probability >= prediction.threshold;
//   const topFeatures = [...prediction.features].sort((a, b) => Math.abs(b.contribution) - Math.abs(a.contribution));
//   const positive = topFeatures.filter(f => f.contribution > 0).slice(0, 2).map(f => f.name).join(", ");
//   const negative = topFeatures.filter(f => f.contribution < 0).slice(0, 2).map(f => f.name).join(", ");

//   const explanationText = isHighProb
//     ? `This game is predicted to have a higher QS chance (${(prediction.qs_probability * 100).toFixed(1)}%). The main factors increasing the probability are ${positive}.`
//     : `This game is predicted to have a lower QS chance. The main negative factors are ${negative}, outweighing favorable stats like ${positive}.`;


//   return (
//     <div className="space-y-8 animate-in fade-in duration-500">
//         {/* Header Summary Card */}
//         <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-xl relative overflow-hidden">
//             <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
            
//             <div className="flex flex-col lg:flex-row justify-between lg:items-end gap-6 relative z-10">
//                 <div>
//                     <div className="flex items-center gap-3 text-sm text-slate-400 font-medium mb-2 uppercase tracking-wide">
//                         <span className="bg-slate-800 px-2 py-0.5 rounded text-white">{prediction.pitcher_id === '1' ? 'LHP' : 'RHP'}</span>
//                         <span>{prediction.pitcher}</span>
//                     </div>
//                     <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
//                         vs {prediction.opp_team}
//                     </h1>
//                     <p className="text-slate-300 max-w-2xl text-lg leading-relaxed">
//                         {explanationText}
//                     </p>
//                 </div>
                
//                 <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
//                     <div>
//                         <label className="block text-xs text-slate-500 uppercase font-semibold mb-1">Target Game Date</label>
//                         <div className="relative">
//                             <input 
//                                 type="date" 
//                                 value={selectedDate}
//                                 onChange={(e) => setSelectedDate(e.target.value)}
//                                 className="bg-slate-800 text-white border border-slate-700 rounded-lg py-2 pl-10 pr-4 focus:ring-2 focus:ring-blue-500 outline-none w-full sm:w-auto"
//                             />
//                             <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         </div>

//         <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
//             {/* Left Column: Gauge & Stats */}
//             <div className="lg:col-span-4 space-y-6">
//                 {/* Gauge Card */}
//                 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
//                     <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
//                         <TrendingUp size={20} className="text-blue-400" />
//                         QS Probability
//                     </h3>
//                     <GaugeChart probability={prediction.qs_probability} threshold={prediction.threshold} />
//                     <div className="mt-4 text-center text-sm text-slate-500">
//                         Threshold: {(prediction.threshold * 100).toFixed(0)}%
//                     </div>
//                 </div>

//                 {/* Key Stats Grid */}
//                 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
//                     <h3 className="text-lg font-semibold text-white mb-4">Season & Context</h3>
//                     <div className="grid grid-cols-2 gap-4">
//                         <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
//                             <div className="text-xs text-slate-500 uppercase">Season ERA</div>
//                             <div className="text-xl font-bold text-slate-200">{stats.era_last_season.toFixed(2)}</div>
//                         </div>
//                         <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
//                             <div className="text-xs text-slate-500 uppercase">WHIP</div>
//                             <div className="text-xl font-bold text-slate-200">{stats.whip_last_season.toFixed(2)}</div>
//                         </div>
//                         <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
//                             <div className="text-xs text-slate-500 uppercase">Opponent OPS</div>
//                             <div className="text-xl font-bold text-slate-200">{stats.opp_ops.toFixed(3)}</div>
//                         </div>
//                          <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
//                             <div className="text-xs text-slate-500 uppercase">Rest Days</div>
//                             <div className="text-xl font-bold text-slate-200">{stats.rest_days}</div>
//                         </div>
//                         <div className="col-span-2 bg-slate-800/50 p-3 rounded-lg border border-slate-700/50 flex justify-between items-center">
//                              <div>
//                                 <div className="text-xs text-slate-500 uppercase">Last 3 Starts Avg IP</div>
//                                 <div className="text-xl font-bold text-slate-200">{stats.avg_ip_last3}</div>
//                              </div>
//                              <div className="h-8 w-[1px] bg-slate-700"></div>
//                              <div className="text-right">
//                                 <div className="text-xs text-slate-500 uppercase">QS Rate</div>
//                                 <div className="text-xl font-bold text-emerald-400">{stats.qs_rate}%</div>
//                              </div>
//                         </div>
//                     </div>
//                 </div>
//             </div>

//             {/* Right Column: Feature Importance & Game Log */}
//             <div className="lg:col-span-8 space-y-6">
                
//                 {/* Feature Importance */}
//                 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
//                     <div className="flex items-center justify-between mb-2">
//                         <h3 className="text-lg font-semibold text-white">Why this prediction?</h3>
//                         <div className="group relative">
//                              <Info size={18} className="text-slate-500 hover:text-blue-400 cursor-help" />
//                              <div className="absolute right-0 w-64 p-2 bg-slate-800 border border-slate-700 rounded text-xs text-slate-300 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 top-6 shadow-xl">
//                                 Features to the right increase QS probability. Features to the left decrease it. Values derived from SHAP analysis.
//                              </div>
//                         </div>
//                     </div>
//                     <p className="text-sm text-slate-400 mb-6">Top contributing factors for the model's output.</p>
//                     <FeatureImportanceChart features={prediction.features} />
//                 </div>

//                 {/* Recent Games */}
//                 <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-lg">
//                     <h3 className="text-lg font-semibold text-white mb-4">Recent Performance</h3>
//                     <RecentGamesTable games={recentGames} />
//                 </div>
//             </div>
//         </div>
//     </div>
//   );
// };