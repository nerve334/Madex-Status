
import React from 'react';
import { StatusType, Incident } from '../types';

interface StatusBarProps {
  history: (StatusType | 'online' | 'offline' | 'warning')[];
  locale?: 'de-DE' | 'en-US';
  isHighRes?: boolean;
  incidents?: Incident[];
  systemId?: string;
}

const StatusBar: React.FC<StatusBarProps> = ({ history, locale = 'en-US', isHighRes = false, incidents = [], systemId }) => {
  const today = new Date();

  return (
    <div className="flex items-end gap-[2px] h-10 w-full group">
      {history.slice(-24).map((status, i) => {
        const barDate = new Date();
        if (isHighRes) {
          barDate.setMinutes(today.getMinutes() - (23 - i) * 5);
        } else {
          barDate.setHours(today.getHours() - (23 - i));
        }

        const dateString = isHighRes 
          ? barDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' })
          : barDate.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' }) + ' ' + barDate.toLocaleDateString(locale, { day: '2-digit', month: 'short' });

        const dateKey = barDate.toISOString().split('T')[0];
        const dayIncidents = !isHighRes && systemId 
          ? incidents.filter(inc => inc.systemId === systemId && inc.date === dateKey)
          : [];

        const hasActiveIncident = dayIncidents.some(inc => inc.status === 'active');
        const hasIncident = dayIncidents.length > 0;

        let color = 'bg-gray-800';
        if (status === 'operational' || status === 'online') color = 'bg-brand';
        if (status === 'degraded') color = 'bg-yellow-400';
        if (status === 'partial' || status === 'warning') color = 'bg-orange-500';
        if (status === 'major' || status === 'offline') color = 'bg-rose-500';
        if (status === 'maintenance') color = 'bg-indigo-500';

        const statusLabel = {
          operational: 'Betrieb',
          degraded: 'Leistungsminderung',
          partial: 'Teilausfall',
          major: 'Grösserer Ausfall',
          maintenance: 'Wartung',
          online: 'Online',
          offline: 'Offline',
          warning: 'Warnung',
        }[status as string] || status;

        return (
          <div
            key={i}
            className={`${color} flex-1 h-6 rounded-[2px] transition-all hover:h-full hover:brightness-125 relative group/item flex items-center justify-center shadow-sm`}
          >
             {hasIncident && (
               <div className={`w-1 h-1 rounded-full ${hasActiveIncident ? 'bg-white animate-pulse' : 'bg-white/40'}`}></div>
             )}

             <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-dark-900 text-[10px] text-white rounded-lg opacity-0 group-hover/item:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-dark-700 shadow-2xl flex flex-col gap-1">
                <div className="flex items-center gap-2">
                  <span className="font-black text-zinc-500 uppercase tracking-widest">{dateString}</span>
                  <span className="w-1 h-1 rounded-full bg-zinc-700"></span>
                  <span className="font-bold">{statusLabel}</span>
                </div>
                {dayIncidents.length > 0 && (
                  <div className="pt-1 border-t border-dark-700 mt-1">
                    <p className="text-[9px] font-black text-brand uppercase tracking-widest mb-1">Vorfälle:</p>
                    {dayIncidents.map(inc => (
                      <p key={inc.id} className={`font-medium ${inc.status === 'active' ? 'text-white' : 'text-zinc-500 line-through'}`}>
                        • {inc.title} {inc.status === 'active' ? '(Aktiv)' : '(Behoben)'}
                      </p>
                    ))}
                  </div>
                )}
             </div>
          </div>
        );
      })}
    </div>
  );
};

export default StatusBar;
