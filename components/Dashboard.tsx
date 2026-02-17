
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
  
  const [filters, setFilters] = useState<FilterCriteria>(() => ({
    subsystems: ['Chassis', 'Packaging'],
    platforms: ['Fsr', 'Bi', 'Ct', 'Mwo', 'Wo'],
    regions: [],
    statuses: Array.from(new Set(data.map(d => d.status))).filter(s => {
      const l = s.toLowerCase();
      return !l.includes('rejected') && !l.includes('unchecked') && l !== 'unknown';
    }),
    submitters: [],
    startYear: 2022,
    endYear: 2026
  }));

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
        item.submitter.toLowerCase().includes(term)
      );
    }
    if (sortConfig.key === 'savings') {
      result = [...result].sort((a, b) => sortConfig.direction === 'asc' ? a.savings - b.savings : b.savings - a.savings);
    }
    return result;
  }, [filteredData, searchTerm, sortConfig]);

  const options = useMemo(() => ({
    subsystems: getUniqueOptions(data, 'subsystem'),
    platforms: getUniqueOptions(data, 'platform'),
    statuses: getUniqueOptions(data, 'status'),
  }), [data]);

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

  return (
    <div className="flex flex-row h-full w-full overflow-hidden bg-[#fafafa]">
      <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full z-20 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Filters</h3>
          <button onClick={() => setFilters({ ...filters, subsystems: [], platforms: [], statuses: [] })} className="text-[10px] text-indigo-600 font-bold hover:underline">Clear</button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-6 custom-scrollbar">
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase block mb-2">Preset Views</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button onClick={() => applyPreset('Chassis')} className={`text-[10px] py-2 rounded-lg border transition-all ${filters.subsystems.includes('Chassis') && filters.subsystems.length === 1 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600'}`}>Chassis</button>
              <button onClick={() => applyPreset('Packaging')} className={`text-[10px] py-2 rounded-lg border transition-all ${filters.subsystems.includes('Packaging') && filters.subsystems.length === 1 ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-slate-200 text-slate-600'}`}>Packaging</button>
            </div>
          </div>

          <FilterGroup label="Subsystems" options={options.subsystems} active={filters.subsystems} onToggle={v => toggleFilter('subsystems', v)} />
          <FilterGroup label="Platforms" options={options.platforms} active={filters.platforms} onToggle={v => toggleFilter('platforms', v)} uppercase onSelectAll={() => selectAll('platforms', options.platforms)} />
          <FilterGroup label="Workflow Status" options={options.statuses} active={filters.statuses} onToggle={v => toggleFilter('statuses', v)} onSelectAll={() => selectAll('statuses', options.statuses)} />
        </div>
        
        <div className="p-4 border-t border-slate-100">
          <button onClick={onReset} className="w-full py-2 bg-slate-50 border border-slate-100 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all">Disconnect</button>
        </div>
      </aside>

      <main className="flex-grow flex flex-col h-full overflow-hidden p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4 flex-shrink-0">
          <MiniKpi label="Active Submissions" value={filteredData.length.toString()} icon="fa-lightbulb" color="text-indigo-600" bg="bg-indigo-50" />
          <MiniKpi label="Aggregated Savings" value={formatCurrency(totalSavings)} icon="fa-vault" color="text-emerald-600" bg="bg-emerald-50" />
          <MiniKpi label="Avg Project Value" value={formatCurrency(avgSavings)} icon="fa-chart-line" color="text-blue-600" bg="bg-blue-50" />
          <MiniKpi label="Engineers" value={new Set(filteredData.map(i => i.submitter)).size.toString()} icon="fa-users-gear" color="text-amber-600" bg="bg-amber-50" />
        </div>

        <div className="flex items-center justify-between">
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95">
            <i className="fa-solid fa-chart-pie"></i>Open Analytics Intelligence
          </button>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">IDEA DATABASE CONNECTED</span>
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          </div>
        </div>

        <div className="flex-grow bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-0">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-6 flex-grow">
              <h4 className="text-sm font-black text-slate-800 tracking-[0.2em] uppercase">IDEA</h4>
              <div className="relative flex-grow max-w-sm">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search repository..." className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-4 py-2 text-[11px] outline-none focus:ring-1 focus:ring-indigo-200 transition-all"/>
              </div>
            </div>
            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <span className="text-indigo-600">{searchedAndSortedData.length}</span> Records Found
            </div>
          </div>
          <div className="flex-grow overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-slate-50 text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100 z-10">
                <tr>
                  <th className="px-6 py-4">ID</th>
                  <th className="px-6 py-4">Title & Submitter</th>
                  <th className="px-6 py-4">System</th>
                  <th className="px-6 py-4">Platform</th>
                  <th className="px-6 py-4 text-right">Potential ($)</th>
                  <th className="px-6 py-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[11px] font-normal text-slate-500">
                {searchedAndSortedData.map((item, index) => (
                  <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group animate-in fade-in slide-in-from-bottom-2" style={{ animationDelay: `${index * 15}ms`, animationFillMode: 'both' }}>
                    <td className="px-6 py-5 font-mono text-[10px] text-indigo-500 font-bold">{item.id}</td>
                    <td className="px-6 py-5">
                      <div className="font-bold text-slate-800 text-xs mb-0.5">{item.title}</div>
                      <div className="text-[9px] uppercase font-bold text-slate-400 flex items-center gap-1">
                        <i className="fa-solid fa-circle-user opacity-30"></i>
                        {item.submitter}
                      </div>
                    </td>
                    <td className="px-6 py-5">{item.subsystem}</td>
                    <td className="px-6 py-5 uppercase font-bold text-slate-400 text-[10px]">{item.platform}</td>
                    <td className="px-6 py-5 text-right font-bold text-emerald-600 text-xs">{formatCurrency(item.savings)}</td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-wider border ${
                        item.status.toLowerCase().includes('approved') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        item.status.toLowerCase().includes('reject') ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-in fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-[2.5rem] shadow-2xl relative flex flex-col animate-in zoom-in slide-in-from-bottom-2 overflow-hidden">
              <div className="p-8 border-b flex items-center justify-between bg-slate-50/50">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">IDEA Analytics</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cross-platform engineering performance</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:text-rose-500 hover:border-rose-100 transition-all shadow-sm">
                  <i className="fa-solid fa-xmark text-lg"></i>
                </button>
              </div>
              <div className="flex-grow p-10 grid grid-cols-1 lg:grid-cols-2 gap-10 overflow-auto custom-scrollbar">
                <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm h-[400px] flex flex-col">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-8">Savings by Subsystem</h4>
                  <div className="flex-grow">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={prepareSubsystemData(filteredData)}>
                        <XAxis dataKey="name" fontSize={9} axisLine={false} tickLine={false} interval={0} angle={-25} textAnchor="end"/>
                        <YAxis fontSize={9} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`}/>
                        <Tooltip contentStyle={{borderRadius:'1rem', border:'none', boxShadow:'0 10px 15px rgba(0,0,0,0.1)'}}/>
                        <Bar dataKey="value" fill="#6366f1" radius={[4,4,0,0]} barSize={35}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white border border-slate-100 rounded-[2rem] p-8 shadow-sm h-[400px] flex flex-col">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-8">Workflow Mix</h4>
                  <div className="flex-grow">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={prepareStatusData(filteredData)} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={5} stroke="none">
                          {prepareStatusData(filteredData).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius:'1rem', border:'none', boxShadow:'0 10px 15px rgba(0,0,0,0.1)'}}/>
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize:'10px', textTransform:'uppercase', fontWeight:'bold', paddingTop:'20px'}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button onClick={() => setIsModalOpen(false)} className="px-8 py-3 bg-slate-800 text-white rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg">Close Analytics</button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

const getUniqueOptions = (data: Idea[], key: keyof Idea) => {
  const counts: Record<string, number> = {};
  data.forEach(item => { const val = String(item[key]); counts[val] = (counts[val] || 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
};

const prepareSubsystemData = (data: Idea[]) => {
  const map: Record<string, number> = {};
  data.forEach(i => map[i.subsystem] = (map[i.subsystem] || 0) + i.savings);
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 8);
};

const prepareStatusData = (data: Idea[]) => {
  const map: Record<string, number> = {};
  data.forEach(i => map[i.status] = (map[i.status] || 0) + 1);
  return Object.entries(map).map(([name, value]) => ({ name, value }));
};

const FilterGroup: React.FC<{ label: string; options: [string, number][]; active: string[]; onToggle: (v: string) => void; onSelectAll?: () => void; uppercase?: boolean; }> = ({ label, options, active, onToggle, onSelectAll, uppercase }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between border-b border-slate-50 pb-1">
      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
      {onSelectAll && <button onClick={onSelectAll} className="text-[8px] font-bold text-indigo-500 uppercase hover:text-indigo-700 transition-colors">Select All</button>}
    </div>
    <div className="space-y-1 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
      {options.map(([name, count]) => (
        <label key={name} className="flex items-center gap-2 cursor-pointer py-0.5 group">
          <input type="checkbox" checked={active.includes(name)} onChange={() => onToggle(name)} className="w-3.5 h-3.5 rounded border-slate-200 text-indigo-600 focus:ring-0 cursor-pointer" />
          <span className={`text-[10px] truncate flex-grow ${uppercase ? 'uppercase font-bold' : ''} ${active.includes(name) ? 'text-indigo-600 font-bold' : 'text-slate-500 group-hover:text-slate-800 transition-colors'}`}>{name}</span>
          <span className="text-[8px] font-bold text-slate-300 bg-slate-50 px-1 rounded">{count}</span>
        </label>
      ))}
    </div>
  </div>
);

const MiniKpi: React.FC<{ label: string; value: string; icon: string; color: string; bg: string }> = ({ label, value, icon, color, bg }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 hover:border-indigo-100 transition-all shadow-sm group">
    <div className={`w-11 h-11 rounded-xl ${bg} flex items-center justify-center ${color} shadow-inner transition-transform group-hover:scale-110`}><i className={`fa-solid ${icon} text-lg`}></i></div>
    <div className="min-w-0"><p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest truncate mb-0.5">{label}</p><p className="text-sm font-black text-slate-800 tracking-tighter truncate">{value}</p></div>
  </div>
);

export default Dashboard;
