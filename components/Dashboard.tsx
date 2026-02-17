
import React, { useMemo, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, 
  PieChart, Pie, Cell
} from 'recharts';
import { Idea } from '../types';

interface DashboardProps {
  data: Idea[];
  onReset: () => void;
}

interface FilterCriteria {
  subsystems: string[];
  platforms: string[];
  regions: string[];
  statuses: string[];
  submitters: string[];
  startYear: number;
  endYear: number;
}

type SortConfig = {
  key: 'savings' | null;
  direction: 'asc' | 'desc';
};

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#334155'];

const Dashboard: React.FC<DashboardProps> = ({ data, onReset }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'savings', direction: 'desc' });
  
  const availableYears = useMemo(() => {
    return Array.from(new Set(data.map(d => d.date.getFullYear()))).sort((a: number, b: number) => a - b);
  }, [data]);

  const [filters, setFilters] = useState<FilterCriteria>(() => {
    const startY = 2022;
    const endY = 2026;
    const defaultSubsystems = ['Chassis', 'Packaging'];
    const defaultPlatforms = ['Fsr', 'Bi', 'Ct', 'Mwo', 'Wo'];
    
    const allStatuses: string[] = Array.from(new Set(data.map(d => d.status)));
    const defaultStatuses = allStatuses.filter((s: string) => {
      const lower = s.toLowerCase();
      return !lower.includes('rejected') && !lower.includes('unchecked') && lower !== 'unknown';
    });

    return {
      subsystems: defaultSubsystems,
      platforms: defaultPlatforms,
      regions: [],
      statuses: defaultStatuses,
      submitters: [],
      startYear: startY,
      endYear: endY
    };
  });

  const filteredData = useMemo(() => {
    return data.filter(item => {
      const year = item.date.getFullYear();
      const matchYear = year >= filters.startYear && year <= filters.endYear;
      const matchSub = filters.subsystems.length === 0 || filters.subsystems.includes(item.subsystem);
      const matchPlat = filters.platforms.length === 0 || filters.platforms.includes(item.platform);
      const matchStat = filters.statuses.length === 0 || filters.statuses.includes(item.status);
      return matchYear && matchSub && matchPlat && matchStat;
    });
  }, [data, filters]);

  const searchedAndSortedData = useMemo(() => {
    let result = filteredData;
    
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item => 
        item.id.toLowerCase().includes(term) ||
        item.title.toLowerCase().includes(term) ||
        item.submitter.toLowerCase().includes(term) ||
        item.subsystem.toLowerCase().includes(term) ||
        item.platform.toLowerCase().includes(term)
      );
    }

    if (sortConfig.key === 'savings') {
      result = [...result].sort((a, b) => {
        return sortConfig.direction === 'asc' ? a.savings - b.savings : b.savings - a.savings;
      });
    }

    return result;
  }, [filteredData, searchTerm, sortConfig]);

  const getUniqueOptions = (key: keyof Idea) => {
    const counts: Record<string, number> = {};
    data.forEach(item => {
      const val = String(item[key]);
      counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const options = useMemo(() => ({
    subsystems: getUniqueOptions('subsystem'),
    platforms: getUniqueOptions('platform'),
    statuses: getUniqueOptions('status'),
  }), [data]);

  const chartSubsystemData = useMemo(() => {
    const map: Record<string, { count: number; savings: number }> = {};
    filteredData.forEach(item => {
      if (!map[item.subsystem]) map[item.subsystem] = { count: 0, savings: 0 };
      map[item.subsystem].count += 1;
      map[item.subsystem].savings += item.savings;
    });
    return Object.entries(map).map(([name, stats]) => ({ name, count: stats.count, value: stats.savings }))
      .sort((a, b) => b.value - a.value).slice(0, 10);
  }, [filteredData]);

  const chartStatusData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredData.forEach(item => {
      map[item.status] = (map[item.status] || 0) + 1;
    });
    return Object.entries(map).map(([name, count]) => ({ name, value: count }))
      .sort((a, b) => b.value - a.value);
  }, [filteredData]);

  const totalSavings = useMemo(() => filteredData.reduce((a, b) => a + b.savings, 0), [filteredData]);
  const avgSavings = useMemo(() => filteredData.length ? totalSavings / filteredData.length : 0, [filteredData, totalSavings]);

  const toggleFilter = (key: keyof FilterCriteria, value: any) => {
    setFilters(prev => {
      const current = prev[key] as any[];
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const selectAll = (key: keyof FilterCriteria, opts: [string, number][]) => {
    setFilters(prev => ({ ...prev, [key]: opts.map(o => o[0]) }));
  };

  const applyPreset = (subsystem: string) => {
    setFilters(prev => ({ ...prev, subsystems: [subsystem] }));
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

  const yearRange = [2022, 2023, 2024, 2025, 2026];

  return (
    <div className="flex flex-row h-full w-full overflow-hidden bg-[#fafafa] font-normal">
      <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full z-20 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Filters</h3>
          <button onClick={() => setFilters({ ...filters, subsystems: [], platforms: [], statuses: [] })} className="text-[10px] text-indigo-600 font-medium hover:underline bg-indigo-50 px-2 py-0.5 rounded transition-all">Clear All</button>
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-6 custom-scrollbar">
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase block mb-2 tracking-tighter">Quick Presets</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => applyPreset('Chassis')} className={`text-[10px] py-2 rounded-lg border transition-all font-medium ${filters.subsystems.length === 1 && filters.subsystems[0] === 'Chassis' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Chassis Only</button>
              <button onClick={() => applyPreset('Packaging')} className={`text-[10px] py-2 rounded-lg border transition-all font-medium ${filters.subsystems.length === 1 && filters.subsystems[0] === 'Packaging' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}>Packaging Only</button>
            </div>
          </div>
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase block mb-2 tracking-tighter">Timeline Focus</label>
            <div className="flex items-center gap-1.5">
              <select value={filters.startYear} onChange={e => setFilters({...filters, startYear: Number(e.target.value)})} className="flex-1 bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-xs font-normal outline-none">{yearRange.map(y => <option key={y} value={y}>{y}</option>)}</select>
              <span className="text-slate-300">/</span>
              <select value={filters.endYear} onChange={e => setFilters({...filters, endYear: Number(e.target.value)})} className="flex-1 bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-xs font-normal outline-none">{yearRange.map(y => <option key={y} value={y}>{y}</option>)}</select>
            </div>
          </div>
          <FilterGroup label="Subsystems" options={options.subsystems} active={filters.subsystems} onToggle={v => toggleFilter('subsystems', v)} />
          <FilterGroup label="Platforms" options={options.platforms} active={filters.platforms} onToggle={v => toggleFilter('platforms', v)} uppercase onSelectAll={() => selectAll('platforms', options.platforms)} />
          <FilterGroup label="Workflow Status" options={options.statuses} active={filters.statuses} onToggle={v => toggleFilter('statuses', v)} onSelectAll={() => selectAll('statuses', options.statuses)} />
        </div>
        <div className="p-4 border-t border-slate-100"><button onClick={onReset} className="w-full py-2 bg-slate-50 border border-slate-100 text-slate-400 rounded-lg text-[10px] font-medium uppercase tracking-widest hover:bg-slate-100 transition-all">Disconnect</button></div>
      </aside>
      <main className="flex-grow flex flex-col h-full overflow-hidden p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4 flex-shrink-0">
          <MiniKpi label="Active Submissions" value={filteredData.length.toString()} icon="fa-lightbulb" color="text-indigo-600" bg="bg-indigo-50" />
          <MiniKpi label="Aggregated Savings" value={formatCurrency(totalSavings)} icon="fa-vault" color="text-emerald-600" bg="bg-emerald-50" />
          <MiniKpi label="Avg Project Value" value={formatCurrency(avgSavings)} icon="fa-chart-line" color="text-blue-600" bg="bg-blue-50" />
          <MiniKpi label="Engineers" value={new Set(filteredData.map(i => i.submitter)).size.toString()} icon="fa-users-gear" color="text-amber-600" bg="bg-amber-50" />
        </div>
        <div className="flex items-center justify-between">
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 border border-indigo-500 rounded-xl text-xs font-semibold text-white hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 group">
            <i className="fa-solid fa-chart-pie transition-transform group-hover:scale-110"></i>Open Analytics Dialog
          </button>
          <div className="flex items-center gap-3"><span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">Active Database View</span><div className="bg-slate-200/50 p-1 rounded-lg flex gap-1"><div className="w-8 h-8 rounded-md bg-white flex items-center justify-center text-indigo-600 shadow-sm"><i className="fa-solid fa-list-check"></i></div></div></div>
        </div>
        <div className="flex-grow bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-0 transition-all">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-6 flex-grow"><h4 className="text-sm font-black text-slate-800 tracking-[0.2em] flex-shrink-0 uppercase">IDEA</h4><div className="relative max-w-sm flex-grow"><i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i><input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Query repository..." className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2 text-[11px] font-normal focus:ring-1 focus:ring-indigo-100 focus:border-indigo-200 outline-none transition-all placeholder:text-slate-400 text-slate-600"/></div></div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"><span className="text-indigo-600">{searchedAndSortedData.length}</span> Objects</div>
          </div>
          <div className="flex-grow overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100 z-10">
                <tr><th className="px-6 py-4 w-24">ID</th><th className="px-6 py-4">Title & Submitter</th><th className="px-6 py-4">Subsystem</th><th className="px-6 py-4">Platform</th><th className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors group" onClick={() => setSortConfig(p => ({key:'savings', direction:p.direction==='asc'?'desc':'asc'}))}><div className="flex items-center justify-end gap-2"><span>Potential ($)</span><i className={`fa-solid ${sortConfig.direction === 'asc' ? 'fa-arrow-up-wide-short' : 'fa-arrow-down-wide-short'} ${sortConfig.key === 'savings' ? 'text-indigo-600' : 'text-slate-200'}`}></i></div></th><th className="px-6 py-4 text-center">Status</th><th className="px-6 py-4 text-center">Source</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[11px] font-normal text-slate-500">
                {searchedAndSortedData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${index * 20}ms`, animationFillMode: 'both' }}>
                    <td className="px-6 py-5 font-mono text-[10px] text-indigo-500 font-semibold">{item.id}</td>
                    <td className="px-6 py-5"><div className="font-medium text-slate-800 text-xs mb-1 group-hover:text-indigo-600 transition-colors">{item.title}</div><div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-bold tracking-wide uppercase"><i className="fa-solid fa-circle-user text-[8px] opacity-40"></i>{item.submitter}</div></td>
                    <td className="px-6 py-5">{item.subsystem}</td>
                    <td className="px-6 py-5"><span className="bg-slate-100 px-2 py-0.5 rounded text-[8px] font-bold uppercase text-slate-500 border border-slate-200">{item.platform}</span></td>
                    <td className="px-6 py-5 text-right font-semibold text-emerald-600 text-[12px]">{formatCurrency(item.savings)}</td>
                    <td className="px-6 py-5 text-center"><span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${item.status.toLowerCase().includes('approved') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : item.status.toLowerCase().includes('reject') ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-blue-50 text-blue-600 border-blue-100'}`}>{item.status}</span></td>
                    <td className="px-6 py-5 text-center">{item.link ? <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-slate-300 hover:text-indigo-600 transition-colors inline-block transform hover:scale-125"><i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i></a> : <span className="text-slate-200 opacity-30">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden relative flex flex-col animate-in zoom-in slide-in-from-bottom-2">
              <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-slate-50/50"><div><h2 className="text-2xl font-black text-slate-800 tracking-tighter">Analytics Intelligence</h2><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Operational performance visualization</p></div><button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 transition-all"><i className="fa-solid fa-xmark text-lg"></i></button></div>
              <div className="flex-grow overflow-auto p-10 custom-scrollbar grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm flex flex-col h-[400px]">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">Subsystem Distribution ($)</h4>
                  <div className="flex-grow w-full h-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                      <BarChart data={chartSubsystemData} margin={{ top: 10, right: 10, left: 10, bottom: 40 }}>
                        <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} angle={-35} textAnchor="end" interval={0} />
                        <YAxis fontSize={8} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} />
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '11px' }} formatter={(v: number) => [formatCurrency(v), 'Savings']} />
                        <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={35} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white rounded-[2rem] border border-slate-100 p-8 shadow-sm flex flex-col h-[400px]">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em] mb-8">Portfolio Status</h4>
                  <div className="flex-grow w-full h-full min-h-0">
                    <ResponsiveContainer width="100%" height="100%" debounce={50}>
                      <PieChart>
                        <Pie data={chartStatusData} dataKey="value" nameKey="name" cx="45%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} stroke="none">
                          {chartStatusData.map((_, index) => <Cell key={`c-${index}`} fill={COLORS[index % COLORS.length]} />)}
                        </Pie>
                        <Tooltip contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '11px' }} />
                        <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" wrapperStyle={{ fontSize: '11px', paddingLeft: '20px', textTransform: 'uppercase', color: '#64748b', fontWeight: 'bold' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end"><button onClick={() => setIsModalOpen(false)} className="px-8 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-900 transition-all">Close</button></div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const FilterGroup: React.FC<{ label: string; options: [string, number][]; active: string[]; onToggle: (v: string) => void; onSelectAll?: () => void; uppercase?: boolean; }> = ({ label, options, active, onToggle, onSelectAll, uppercase }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between border-b border-slate-50 pb-1"><label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>{onSelectAll && <button onClick={onSelectAll} className="text-[8px] font-bold text-indigo-500 hover:text-indigo-700 uppercase">Select All</button>}</div>
    <div className="space-y-1 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
      {options.map(([name, count]) => (
        <label key={name} className="flex items-center gap-2 group cursor-pointer py-0.5 transition-all">
          <input type="checkbox" checked={active.includes(name)} onChange={() => onToggle(name)} className="w-3.5 h-3.5 rounded border-slate-200 text-indigo-600 focus:ring-0 cursor-pointer" />
          <span className={`text-[10px] truncate flex-grow ${uppercase ? 'uppercase font-bold' : ''} ${active.includes(name) ? 'text-indigo-600 font-semibold' : 'text-slate-500 group-hover:text-slate-800'}`}>{name}</span>
          <span className="text-[8px] font-bold text-slate-300 bg-slate-50 px-1 rounded">{count}</span>
        </label>
      ))}
    </div>
  </div>
);

const MiniKpi: React.FC<{ label: string; value: string; icon: string; color: string; bg: string }> = ({ label, value, icon, color, bg }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4 group hover:border-indigo-100 transition-all hover:-translate-y-0.5 duration-300">
    <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center ${color} shadow-inner transition-transform group-hover:rotate-6`}><i className={`fa-solid ${icon} text-lg`}></i></div>
    <div className="min-w-0"><p className="text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-0.5 truncate">{label}</p><p className="text-sm font-black text-slate-800 tracking-tighter truncate">{value}</p></div>
  </div>
);

export default Dashboard;
