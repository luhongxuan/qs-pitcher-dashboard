import React from 'react';
import { GameLog } from '../types';
import { CheckCircle2, XCircle } from 'lucide-react';

export const RecentGamesTable: React.FC<{ games: GameLog[] }> = ({ games }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm whitespace-nowrap">
        <thead className="uppercase tracking-wider border-b-2 border-slate-700 bg-slate-900/50 text-slate-400">
          <tr>
            <th scope="col" className="px-4 py-3">Date</th>
            <th scope="col" className="px-4 py-3">Opponent</th>
            <th scope="col" className="px-4 py-3">Result</th>
            <th scope="col" className="px-4 py-3 text-right">IP</th>
            <th scope="col" className="px-4 py-3 text-right">ER</th>
            <th scope="col" className="px-4 py-3 text-right">H</th>
            <th scope="col" className="px-4 py-3 text-right">BB</th>
            <th scope="col" className="px-4 py-3 text-right">SO</th>
            <th scope="col" className="px-4 py-3 text-center">QS</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {games.map((game) => (
            <tr key={game.id} className="hover:bg-slate-800/50 transition-colors">
              <td className="px-4 py-3 font-medium text-slate-200">{game.date}</td>
              <td className="px-4 py-3 text-slate-400">{game.opponent}</td>
              <td className="px-4 py-3 text-slate-300">{game.result}</td>
              <td className="px-4 py-3 text-right text-slate-300">{game.ip}</td>
              <td className="px-4 py-3 text-right text-slate-300">{game.er}</td>
              <td className="px-4 py-3 text-right text-slate-400">{game.h}</td>
              <td className="px-4 py-3 text-right text-slate-400">{game.bb}</td>
              <td className="px-4 py-3 text-right text-slate-300">{game.so}</td>
              <td className="px-4 py-3 flex justify-center">
                {game.is_qs ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : (
                  <XCircle size={18} className="text-slate-600" />
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};