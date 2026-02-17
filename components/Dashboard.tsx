
import React, { useMemo, useState, useEffect } from 'react';
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
  statuses: string[];
  startYear: number;
  endYear: number;
}

type SortConfig = {
  key: 'savings' | null;
  direction: 'asc' | 'desc';
};

/**
 * Beach Ball Corporate Palette
 * Red: #EC1D26 | Blue: #2DC3E0 | Green: #27B45E | Orange: #F7941D
 */
const COLORS = [
  '#2DC3E0', // Blue (Primary)
  '#27B45E', // Green (Secondary)
  '#F7941D', // Orange (Warning/Alt)
  '#EC1D26', // Red (Critical)
  '#64748B', // Slate (Neutral)
  '#A855F7', // Purple (Accent)
  '#06B6D4'  // Cyan (Accent)
];

const Dashboard: React.FC<DashboardProps> = ({ data, onReset }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'savings', direction: 'desc' });
  
  const availableYears = useMemo(() => {
    const years = data.map(d => d.date.getFullYear());
    return Array.from(new Set(years)).sort((a, b) => a - b);
  }, [data]);

  const options = useMemo(() => ({
    subsystems: getUniqueOptions(data, 'subsystem'),
    platforms: getUniqueOptions(data, 'platform'),
    statuses: getUniqueOptions(data, 'status'),
  }), [data]);

  // Initial Filter State Logic based on user request
  const [filters, setFilters] = useState<FilterCriteria>(() => {
    // Subsystems: Chassis and Packaging
    const defaultSubsystems = ['Chassis', 'Packaging'];
    
    // Platforms: FSR, WO, CT, MWO
    const defaultPlatforms = ['Fsr', 'Wo', 'Ct', 'Mwo'];

    // Statuses: All except Rejected
    const allStatuses = options.statuses.map(([name]) => name);
    const defaultStatuses = allStatuses.filter(s => !s.toLowerCase().includes('reject'));

    return {
      subsystems: defaultSubsystems,
      platforms: defaultPlatforms,
      statuses: defaultStatuses,
      startYear: availableYears[0] || 2020,
      endYear: availableYears[availableYears.length - 1] || 2026
    };
  });

  // Ensure filters populate if initial options were empty during first render
  useEffect(() => {
    if (data.length > 0 && filters.statuses.length === 0) {
      const allStatuses = options.statuses.map(([name]) => name);
      const defaultStatuses = allStatuses.filter(s => !s.toLowerCase().includes('reject'));
      setFilters(prev => ({
        ...prev,
        statuses: defaultStatuses
      }));
    }
  }, [options.statuses]);

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

  const totalSavings = useMemo(() => filteredData.reduce((a, b) => a + b.savings, 0), [filteredData]);
  const avgSavings = useMemo(() => filteredData.length ? totalSavings / filteredData.length : 0, [filteredData, totalSavings]);

  const toggleFilter = (key: keyof FilterCriteria, value: any) => {
    setFilters(prev => {
      const current = prev[key];
      if (!Array.isArray(current)) return prev;
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const handleSelectAll = (key: keyof FilterCriteria, allValues: string[]) => {
    setFilters(prev => ({ ...prev, [key]: allValues }));
  };

  const handleDeselectAll = (key: keyof FilterCriteria) => {
    setFilters(prev => ({ ...prev, [key]: [] }));
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { 
    style: 'currency', 
    currency: 'USD', 
    maximumFractionDigits: 0 
  }).format(v);

  return (
    <div className="flex flex-row h-full w-full overflow-hidden bg-slate-50 font-sans">
      <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full z-20">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Control Panel</h3>
          <button 
            onClick={() => setFilters({ ...filters, subsystems: [], platforms: [], statuses: [] })} 
            className="text-[10px] text-slate-400 font-medium hover:text-[#2DC3E0] transition-colors"
          >
            Clear All
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-8 custom-scrollbar">
          {/* Year Filter */}
          <section className="space-y-3">
            <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block border-b border-slate-50 pb-1">Submission Year</label>
            <div className="flex gap-2">
              <select 
                value={filters.startYear} 
                onChange={(e) => setFilters(f => ({...f, startYear: parseInt(e.target.value)}))}
                className="w-1/2 text-xs border border-slate-200 rounded-md p-1.5 outline-none focus:ring-1 focus:ring-[#2DC3E0] bg-white shadow-sm"
              >
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select 
                value={filters.endYear} 
                onChange={(e) => setFilters(f => ({...f, endYear: parseInt(e.target.value)}))}
                className="w-1/2 text-xs border border-slate-200 rounded-md p-1.5 outline-none focus:ring-1 focus:ring-[#2DC3E0] bg-white shadow-sm"
              >
                {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </section>

          <FilterGroup 
            label="Subsystems" 
            options={options.subsystems} 
            active={filters.subsystems} 
            onToggle={v => toggleFilter('subsystems', v)} 
            onSelectAll={() => handleSelectAll('subsystems', options.subsystems.map(o => o[0]))}
            onDeselectAll={() => handleDeselectAll('subsystems')}
          />
          
          <FilterGroup 
            label="Platforms" 
            options={options.platforms} 
            active={filters.platforms} 
            onToggle={v => toggleFilter('platforms', v)} 
            uppercase 
            onSelectAll={() => handleSelectAll('platforms', options.platforms.map(o => o[0]))}
            onDeselectAll={() => handleDeselectAll('platforms')}
          />
          
          <FilterGroup 
            label="Workflow Status" 
            options={options.statuses} 
            active={filters.statuses} 
            onToggle={v => toggleFilter('statuses', v)} 
            onSelectAll={() => handleSelectAll('statuses', options.statuses.map(o => o[0]))}
            onDeselectAll={() => handleDeselectAll('statuses')}
          />
        </div>
        
        <div className="p-4 border-t border-slate-100">
          <button onClick={onReset} className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-500 rounded-lg text-[10px] font-semibold uppercase tracking-wider hover:bg-slate-100 transition-all">Disconnect Source</button>
        </div>
      </aside>

      <main className="flex-grow flex flex-col h-full overflow-hidden p-6 space-y-6">
        {/* KPI Cards with Palette Colors */}
        <div className="grid grid-cols-4 gap-4 flex-shrink-0 animate-fade-in">
          <MiniKpi label="Active Submissions" value={filteredData.length.toLocaleString()} icon="fa-lightbulb" color="text-[#F7941D]" bg="bg-white" />
          <MiniKpi label="Total Est. Savings" value={formatCurrency(totalSavings)} icon="fa-chart-simple" color="text-[#27B45E]" bg="bg-white" />
          <MiniKpi label="Mean Project Value" value={formatCurrency(avgSavings)} icon="fa-calculator" color="text-[#2DC3E0]" bg="bg-white" />
          <MiniKpi label="Project Leads" value={new Set(filteredData.map(i => i.submitter)).size.toString()} icon="fa-user-group" color="text-slate-600" bg="bg-white" />
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between animate-fade-in delay-100">
          <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2 bg-[#2DC3E0] text-white rounded-lg text-xs font-semibold shadow-md hover:brightness-110 transition-all active:scale-95">
            <i className="fa-solid fa-chart-line text-[10px]"></i> Visual Analytics
          </button>
          <div className="flex items-center gap-3 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
            <div className="w-1.5 h-1.5 bg-[#27B45E] rounded-full"></div>
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Live Repository Sync</span>
          </div>
        </div>

        {/* Main Data Repository */}
        <div className="flex-grow bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-0 animate-slide-up">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-8 flex-grow">
              <h4 className="text-[11px] font-semibold text-slate-400 tracking-wider uppercase">Idea Repository</h4>
              <div className="relative flex-grow max-w-sm">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search by ID, Title or Originator..." className="w-full bg-slate-50 border border-slate-100 rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-[#2DC3E0] transition-all shadow-inner"/>
              </div>
            </div>
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <span className="text-slate-900">{searchedAndSortedData.length}</span> Objects
            </div>
          </div>
          
          <div className="flex-grow overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white text-slate-400 text-[10px] uppercase font-semibold tracking-wider border-b border-slate-100 z-10">
                <tr>
                  <th className="px-6 py-4 font-semibold">Project ID</th>
                  <th className="px-6 py-4 font-semibold">Title & Originator</th>
                  <th className="px-6 py-4 font-semibold">Subsystem</th>
                  <th className="px-6 py-4 font-semibold">Platform</th>
                  <th className="px-6 py-4 text-right font-semibold cursor-pointer hover:text-[#2DC3E0] transition-colors" onClick={() => setSortConfig(prev => ({ key: 'savings', direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}>
                    Potential ($) {sortConfig.key === 'savings' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                  </th>
                  <th className="px-6 py-4 text-center font-semibold">Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[12px] text-slate-600">
                {searchedAndSortedData.map((item) => (
                  <tr key={item.id} className="transition-colors group border-b border-slate-50">
                    <td className="px-6 py-4 font-mono text-[11px] text-slate-400">{item.id}</td>
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-800 text-[12px]">{item.title}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                        {item.submitter}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-500">{item.subsystem}</td>
                    <td className="px-6 py-4 uppercase font-semibold text-slate-300 text-[10px]">{item.platform}</td>
                    <td className="px-6 py-4 text-right font-semibold text-slate-700">{formatCurrency(item.savings)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider border ${
                        item.status.toLowerCase().includes('approved') ? 'bg-emerald-50 text-[#27B45E] border-[#27B45E]/20' :
                        item.status.toLowerCase().includes('reject') ? 'bg-rose-50 text-[#EC1D26] border-[#EC1D26]/20' :
                        'bg-slate-50 text-slate-500 border-slate-100'
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

        {/* Modal/Overlay Analytics with Beach Ball Colors */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-[4px]" onClick={() => setIsModalOpen(false)}></div>
            <div className="bg-white w-full max-w-5xl h-[80vh] rounded-2xl shadow-2xl relative flex flex-col animate-slide-up overflow-hidden border border-slate-200">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-800 tracking-tight">Intelligence Dashboard</h2>
                  <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">Distribution Analysis</p>
                </div>
                <button onClick={() => setIsModalOpen(false)} className="w-8 h-8 rounded-lg border border-slate-200 bg-white flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all">
                  <i className="fa-solid fa-xmark"></i>
                </button>
              </div>
              <div className="flex-grow p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-auto custom-scrollbar bg-slate-50">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-[380px] flex flex-col">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-6">Savings by Subsystem ($)</h4>
                  <div className="flex-grow">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={prepareSubsystemData(filteredData)}>
                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end"/>
                        <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`}/>
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius:'8px', border:'1px solid #e2e8f0', boxShadow:'0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '11px'}}/>
                        <Bar dataKey="value" fill="#2DC3E0" radius={[4,4,0,0]} barSize={28}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-[380px] flex flex-col">
                  <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-6">Workflow Status Distribution</h4>
                  <div className="flex-grow">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={prepareStatusData(filteredData)} dataKey="value" cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} stroke="#fff" strokeWidth={2}>
                          {prepareStatusData(filteredData).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius:'8px', border:'none', boxShadow:'0 10px 15px rgba(0,0,0,0.1)', fontSize: '11px'}}/>
                        <Legend verticalAlign="bottom" height={36} wrapperStyle={{fontSize:'10px', fontWeight:'500', textTransform:'uppercase', paddingTop: '15px'}}/>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
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

const FilterGroup: React.FC<{ 
  label: string; 
  options: [string, number][]; 
  active: string[]; 
  onToggle: (v: string) => void; 
  onSelectAll: () => void;
  onDeselectAll: () => void;
  uppercase?: boolean; 
}> = ({ label, options, active, onToggle, onSelectAll, onDeselectAll, uppercase }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between border-b border-slate-50 pb-1">
      <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">{label}</label>
      <div className="flex gap-2">
        <button onClick={onSelectAll} className="text-[9px] text-[#2DC3E0] font-bold uppercase hover:brightness-90 transition-all">All</button>
        <button onClick={onDeselectAll} className="text-[9px] text-slate-300 font-bold uppercase hover:text-slate-500">None</button>
      </div>
    </div>
    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
      {options.map(([name, count]) => (
        <label key={name} className="flex items-center gap-2.5 cursor-pointer group py-0.5">
          <div className="relative flex items-center">
            <input 
              type="checkbox" 
              checked={active.includes(name)} 
              onChange={() => onToggle(name)} 
              className="w-3.5 h-3.5 rounded border-slate-300 text-[#2DC3E0] focus:ring-0 focus:ring-offset-0 cursor-pointer" 
            />
          </div>
          <span className={`text-[11px] truncate flex-grow ${active.includes(name) ? 'text-slate-700 font-semibold' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} ${uppercase ? 'uppercase' : ''}`}>{name}</span>
          <span className="text-[9px] font-medium text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{count}</span>
        </label>
      ))}
    </div>
  </div>
);

const MiniKpi: React.FC<{ label: string; value: string; icon: string; color: string; bg: string }> = ({ label, value, icon, color, bg }) => (
  <div className={`${bg} border border-slate-200 rounded-xl p-4 flex items-center gap-4 shadow-sm hover:border-slate-300 transition-all group`}>
    <div className={`w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center ${color} shadow-sm group-hover:scale-105 transition-transform`}>
      <i className={`fa-solid ${icon} text-base`}></i>
    </div>
    <div className="min-w-0">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider truncate">{label}</p>
      <p className="text-lg font-bold text-slate-800 tracking-tight truncate">{value}</p>
    </div>
  </div>
);

export default Dashboard;
