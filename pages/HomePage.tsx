import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Filter, TrendingUp, Users } from 'lucide-react';
import { getTopPitchers } from '../services/api';
import { Pitcher } from '../types';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [pitchers, setPitchers] = useState<Pitcher[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const data = await getTopPitchers();
        setPitchers(data);
      } catch (err) {
        console.error("Failed to fetch top pitchers", err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTerm = searchTerm.trim();

    if(trimmedTerm) {
      navigate(`/pitcher/${encodeURIComponent(trimmedTerm)}`);
    }
  };

  return (
    <div className="space-y-12">
      {/* Hero / Search Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-900 via-slate-900 to-slate-950 border border-slate-800 shadow-2xl p-8 md:p-16 text-center">
        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight">
            Predict Quality Starts <br/>
            <span className="text-blue-400">Before First Pitch</span>
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Leverage advanced ML models to analyze matchups, rest days, and recent form. 
            Get the edge in your fantasy league or betting strategy.
          </p>

          <form onSubmit={handleSearchSubmit} className="mt-8 flex w-full max-w-lg mx-auto bg-slate-800/80 p-2 rounded-xl border border-slate-700 shadow-lg backdrop-blur-sm focus-within:ring-2 focus-within:ring-blue-500 transition-all">
            <Search className="text-slate-400 ml-3 my-auto" size={20} />
            <input 
              type="text" 
              placeholder="Search pitcher (e.g. Tarik Skubal)..." 
              className="w-full bg-transparent px-4 py-2 text-white outline-none placeholder:text-slate-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-2 rounded-lg transition-colors">
              Search
            </button>
          </form>
        </div>
        
        {/* Background decorative blob */}
        <div className="absolute top-0 left-0 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-0 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl"></div>
      </section>

      {/* Rankings Section */}
      <section>
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-emerald-400" size={24} />
            <h2 className="text-2xl font-bold text-white">Top Pitchers (QS Probability)</h2>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative">
                <select className="appearance-none bg-slate-800 border border-slate-700 text-slate-300 py-2 pl-4 pr-10 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500">
                  <option>Next Start Probability</option>
                  <option>Season QS %</option>
                  <option>Season ERA</option>
                </select>
                <Filter size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
             </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {pitchers.map((pitcher, index) => (
              <div 
                key={index}
                onClick={() => navigate(`/pitcher/${pitcher.pitcher_name}`)}
                className="group bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-blue-500/50 hover:shadow-xl hover:shadow-blue-500/10 transition-all cursor-pointer relative overflow-hidden"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <img 
                      src={pitcher.image_url} 
                      alt={pitcher.pitcher_name} 
                      className="w-14 h-14 rounded-full object-cover border-2 border-slate-700 group-hover:border-blue-500 transition-colors"
                    />
                    <div>
                      <h3 className="text-lg font-bold text-white group-hover:text-blue-400 transition-colors">{pitcher.pitcher_name}</h3>
                      <p className="text-sm text-slate-400">{pitcher.team} • {pitcher.opp_team}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="bg-slate-800 px-2 py-1 rounded text-xs text-slate-400 font-mono mb-1">QS%</div>
                    <div className="font-bold text-white">{(pitcher.qs_probability*100).toFixed(1)}%</div>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-2 border-t border-slate-800 pt-4">
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase">avg_ERA</div>
                    <div className="font-semibold text-slate-200">{pitcher.avg_er_last3}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase">avg_IP</div>
                    <div className="font-semibold text-slate-200">{pitcher.avg_ip_last3}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-slate-500 uppercase">Next Prob</div>
                    <div className={`font-bold ${
                      (pitcher.qs_probability*100 || 0) > 80 ? 'text-emerald-400' : 
                      (pitcher.qs_probability*100 || 0) > 50 ? 'text-yellow-400' : 'text-rose-400'
                    }`}>
                      {(pitcher.qs_probability*100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};