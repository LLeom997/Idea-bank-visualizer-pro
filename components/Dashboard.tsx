
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
  const [showCharts, setShowCharts] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: null, direction: 'desc' });
  
  const availableYears = useMemo(() => {
    return Array.from(new Set(data.map(d => d.date.getFullYear()))).sort((a: number, b: number) => a - b);
  }, [data]);

  // Initializing with requested Default Filters
  const [filters, setFilters] = useState<FilterCriteria>(() => {
    // Default Timeline: 2022 to 2026 as requested
    const startY = 2022;
    const endY = 2026;
    
    // Default Subsystems: Chassis and Packaging
    const defaultSubsystems = ['Chassis', 'Packaging'];
    
    // Default Platforms: FSR, BI, CT, MWO, WO
    const defaultPlatforms = ['Fsr', 'Bi', 'Ct', 'Mwo', 'Wo'];
    
    // Default Workflow Status: All except rejected and unchecked
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
      .sort((a, b) => b.value - a.value).slice(0, 8);
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
    setFilters(prev => ({
      ...prev,
      [key]: opts.map(o => o[0])
    }));
  };

  const applyPreset = (subsystem: string) => {
    setFilters(prev => ({
      ...prev,
      subsystems: [subsystem]
    }));
  };

  const handleSort = () => {
    setSortConfig(prev => ({
      key: 'savings',
      direction: prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(v);

  const yearRange = Array.from({ length: 11 }, (_, i) => 2020 + i);

  return (
    <div className="flex flex-row h-full w-full overflow-hidden bg-[#fafafa] font-normal">
      {/* Sidebar Filters */}
      <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full z-20 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[10px] font-medium text-slate-400 uppercase tracking-widest">Filters</h3>
          <button 
            onClick={() => setFilters({ ...filters, subsystems: [], platforms: [], statuses: [] })} 
            className="text-[10px] text-indigo-600 font-medium hover:underline bg-indigo-50 px-2 py-0.5 rounded transition-all"
          >
            Clear All
          </button>
        </div>
        
        <div className="flex-grow overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {/* Pre-set Tabs Section */}
          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase block mb-2 tracking-tighter">Pre-set Views</label>
            <div className="grid grid-cols-2 gap-1.5">
              <button 
                onClick={() => applyPreset('Chassis')}
                className={`text-[10px] py-2 rounded-lg border transition-all font-medium ${filters.subsystems.length === 1 && filters.subsystems[0] === 'Chassis' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                Chassis
              </button>
              <button 
                onClick={() => applyPreset('Packaging')}
                className={`text-[10px] py-2 rounded-lg border transition-all font-medium ${filters.subsystems.length === 1 && filters.subsystems[0] === 'Packaging' ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
              >
                Packaging
              </button>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-medium text-slate-400 uppercase block mb-2 tracking-tighter">Timeline Focus</label>
            <div className="flex items-center gap-1.5">
              <select 
                value={filters.startYear} 
                onChange={e => setFilters({...filters, startYear: Number(e.target.value)})} 
                className="flex-1 bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-xs font-normal focus:ring-1 focus:ring-indigo-100 outline-none"
              >
                {yearRange.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <span className="text-slate-300">/</span>
              <select 
                value={filters.endYear} 
                onChange={e => setFilters({...filters, endYear: Number(e.target.value)})} 
                className="flex-1 bg-slate-50 border border-slate-100 rounded-lg p-1.5 text-xs font-normal focus:ring-1 focus:ring-indigo-100 outline-none"
              >
                {yearRange.map(y => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
          </div>

          <FilterGroup 
            label="Subsystems" 
            options={options.subsystems} 
            active={filters.subsystems} 
            onToggle={v => toggleFilter('subsystems', v)} 
          />
          <FilterGroup 
            label="Platforms" 
            options={options.platforms} 
            active={filters.platforms} 
            onToggle={v => toggleFilter('platforms', v)} 
            uppercase
          />
          <FilterGroup 
            label="Workflow Status" 
            options={options.statuses} 
            active={filters.statuses} 
            onToggle={v => toggleFilter('statuses', v)} 
            onSelectAll={() => selectAll('statuses', options.statuses)}
          />
        </div>

        <div className="p-4 border-t border-slate-100">
          <button 
            onClick={onReset} 
            className="w-full py-2 bg-slate-50 border border-slate-100 text-slate-400 rounded-lg text-[10px] font-medium uppercase tracking-widest hover:bg-slate-100 transition-all"
          >
            Disconnect Data
          </button>
        </div>
      </aside>

      <main className="flex-grow flex flex-col h-full overflow-hidden p-6 space-y-6">
        {/* KPI Row */}
        <div className="grid grid-cols-4 gap-4 flex-shrink-0">
          <MiniKpi label="Active Ideas" value={filteredData.length.toString()} icon="fa-lightbulb" color="text-indigo-600" bg="bg-indigo-50" />
          <MiniKpi label="Estimated Savings" value={formatCurrency(totalSavings)} icon="fa-vault" color="text-emerald-600" bg="bg-emerald-50" />
          <MiniKpi label="Avg Potential" value={formatCurrency(avgSavings)} icon="fa-chart-line" color="text-blue-600" bg="bg-blue-50" />
          <MiniKpi label="Submitters" value={new Set(filteredData.map(i => i.submitter)).size.toString()} icon="fa-users-gear" color="text-amber-600" bg="bg-amber-50" />
        </div>

        {/* Action Bar */}
        <div className="flex items-center justify-between">
          <button 
            onClick={() => setShowCharts(!showCharts)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all shadow-sm group"
          >
            <i className={`fa-solid ${showCharts ? 'fa-chart-pie' : 'fa-chart-simple'} transition-transform group-hover:scale-110`}></i>
            {showCharts ? 'Hide Analytics' : 'Show Analytics Panel'}
          </button>
          
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-widest">View Mode</span>
            <div className="bg-slate-200/50 p-1 rounded-lg flex gap-1">
              <div className="w-8 h-8 rounded-md bg-white flex items-center justify-center text-indigo-600 shadow-sm"><i className="fa-solid fa-table-list"></i></div>
            </div>
          </div>
        </div>

        {/* Collapsible Analytics Section */}
        {showCharts && (
          <div className="grid grid-cols-2 gap-6 flex-shrink-0 min-h-[260px] animate-in slide-in-from-top duration-300 ease-out overflow-visible">
            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col relative h-full">
              <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-4">Subsystem Distribution ($)</h4>
              <div className="flex-grow h-full min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartSubsystemData} margin={{ top: 5, right: 30, left: 20, bottom: 20 }}>
                    <XAxis 
                      dataKey="name" 
                      fontSize={9} 
                      axisLine={false} 
                      tickLine={false} 
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis 
                      fontSize={8} 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#94a3b8'}} 
                      tickFormatter={(v) => `$${v/1000}k`} 
                    />
                    <Tooltip 
                      cursor={{fill: '#f8fafc'}} 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }}
                      formatter={(value: number) => [formatCurrency(value), 'Savings']}
                    />
                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col relative h-full">
              <h4 className="text-[10px] font-medium text-slate-400 uppercase tracking-widest mb-4">Portfolio Status</h4>
              <div className="flex-grow h-full min-h-0 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie 
                      data={chartStatusData} 
                      dataKey="value" 
                      nameKey="name" 
                      cx="50%" 
                      cy="50%" 
                      innerRadius={50} 
                      outerRadius={75} 
                      paddingAngle={4} 
                      stroke="none"
                    >
                      {chartStatusData.map((_, index) => <Cell key={`c-${index}`} fill={COLORS[index % COLORS.length]} />)}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px' }} />
                    <Legend 
                      verticalAlign="middle" 
                      align="right" 
                      layout="vertical" 
                      iconType="circle" 
                      wrapperStyle={{ fontSize: '10px', paddingLeft: '20px', textTransform: 'uppercase', color: '#64748b' }} 
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Idea Repository Card - Renamed to IDEA */}
        <div className="flex-grow bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-0 transition-all duration-500">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-6 flex-grow">
              <h4 className="text-sm font-medium text-slate-800 tracking-tight flex-shrink-0 uppercase tracking-widest">IDEA</h4>
              <div className="relative max-w-sm flex-grow">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search projects, requesters or ID..."
                  className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-9 pr-3 py-2 text-[11px] font-normal focus:ring-1 focus:ring-indigo-100 focus:border-indigo-200 outline-none transition-all placeholder:text-slate-400 text-slate-600"
                />
              </div>
            </div>
            <div className="text-[9px] font-medium text-slate-400 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <span className="text-indigo-600 font-semibold">{searchedAndSortedData.length}</span> Records
            </div>
          </div>

          <div className="flex-grow overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead className="sticky top-0 bg-slate-50 text-slate-400 text-[10px] uppercase font-medium tracking-widest border-b border-slate-100 z-10">
                <tr>
                  <th className="px-6 py-4 w-24">ID</th>
                  <th className="px-6 py-4">Project & Submitter</th>
                  <th className="px-6 py-4">System</th>
                  <th className="px-6 py-4">Platform</th>
                  <th 
                    className="px-6 py-4 text-right cursor-pointer hover:bg-slate-100 transition-colors group"
                    onClick={handleSort}
                  >
                    <div className="flex items-center justify-end gap-2">
                      <span>Potential</span>
                      <i className={`fa-solid ${sortConfig.direction === 'asc' ? 'fa-arrow-up-wide-short' : 'fa-arrow-down-wide-short'} ${sortConfig.key === 'savings' ? 'text-indigo-600' : 'text-slate-200'} transition-all`}></i>
                    </div>
                  </th>
                  <th className="px-6 py-4 text-center">Status</th>
                  <th className="px-6 py-4 text-center">Source</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[11px] font-normal text-slate-500">
                {searchedAndSortedData.map((item, index) => (
                  <tr 
                    key={item.id} 
                    className="hover:bg-slate-50/50 transition-colors group animate-in fade-in slide-in-from-bottom-2 duration-700"
                    style={{ animationDelay: `${Math.min(index * 20, 400)}ms`, animationFillMode: 'both' }}
                  >
                    <td className="px-6 py-5 font-mono text-[10px] text-indigo-500 font-medium">{item.id}</td>
                    <td className="px-6 py-5">
                      <div className="font-medium text-slate-700 text-xs mb-1 group-hover:text-indigo-600 transition-colors">{item.title}</div>
                      <div className="flex items-center gap-1.5 text-slate-400 text-[9px] font-medium tracking-wide">
                        <i className="fa-solid fa-user text-[8px]"></i>
                        {item.submitter}
                      </div>
                    </td>
                    <td className="px-6 py-5">{item.subsystem}</td>
                    <td className="px-6 py-5">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[8px] font-medium uppercase text-slate-500 border border-slate-200">
                        {item.platform}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-right font-medium text-emerald-600 text-[12px]">{formatCurrency(item.savings)}</td>
                    <td className="px-6 py-5 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[8px] font-medium uppercase tracking-wider border ${
                        item.status.toLowerCase().includes('approved') ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        item.status.toLowerCase().includes('reject') ? 'bg-rose-50 text-rose-600 border-rose-100' :
                        'bg-blue-50 text-blue-600 border-blue-100'
                      }`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-5 text-center">
                      {item.link ? (
                        <a 
                          href={item.link} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="text-slate-300 hover:text-indigo-600 transition-colors inline-block"
                        >
                          <i className="fa-solid fa-arrow-up-right-from-square text-[10px]"></i>
                        </a>
                      ) : (
                        <span className="text-slate-200 opacity-30">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {searchedAndSortedData.length === 0 && (
              <div className="py-24 flex flex-col items-center justify-center animate-in fade-in duration-1000">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4 text-slate-200 border border-slate-100">
                  <i className="fa-solid fa-magnifying-glass text-2xl"></i>
                </div>
                <p className="text-[10px] font-medium uppercase tracking-widest text-slate-400">Zero matches for current filters</p>
                <button onClick={() => { setSearchTerm(''); setSortConfig({key:null, direction:'desc'}); }} className="mt-4 text-indigo-600 text-[10px] font-medium uppercase hover:underline">Reset</button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

// Filter Group Subcomponent with Select All and Uppercase Support
const FilterGroup: React.FC<{ 
  label: string; 
  options: [string, number][]; 
  active: string[]; 
  onToggle: (v: string) => void;
  onSelectAll?: () => void;
  uppercase?: boolean;
}> = ({ label, options, active, onToggle, onSelectAll, uppercase }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between border-b border-slate-50 pb-1">
      <label className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">{label}</label>
      {onSelectAll && (
        <button 
          onClick={onSelectAll}
          className="text-[8px] font-medium text-indigo-500 hover:underline uppercase tracking-tighter"
        >
          Select All
        </button>
      )}
    </div>
    <div className="space-y-1 max-h-40 overflow-y-auto pr-2 custom-scrollbar">
      {options.map(([name, count]) => (
        <label key={name} className="flex items-center gap-2 group cursor-pointer py-0.5 transition-all">
          <input 
            type="checkbox" 
            checked={active.includes(name)} 
            onChange={() => onToggle(name)} 
            className="w-3 h-3 rounded border-slate-200 text-indigo-600 focus:ring-0 cursor-pointer transition-colors" 
          />
          <span className={`text-[10px] truncate flex-grow ${uppercase ? 'uppercase' : ''} ${active.includes(name) ? 'text-indigo-600 font-medium' : 'text-slate-500 group-hover:text-slate-800'}`}>
            {name}
          </span>
          <span className="text-[8px] font-medium text-slate-300 bg-slate-50 px-1 rounded">{count}</span>
        </label>
      ))}
    </div>
  </div>
);

// KPI Subcomponent
const MiniKpi: React.FC<{ label: string; value: string; icon: string; color: string; bg: string }> = ({ label, value, icon, color, bg }) => (
  <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm flex items-center gap-4 group hover:border-indigo-100 transition-all hover:-translate-y-0.5 duration-300">
    <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center ${color} shadow-inner transition-transform group-hover:scale-105`}>
      <i className={`fa-solid ${icon} text-lg`}></i>
    </div>
    <div className="min-w-0">
      <p className="text-[8px] font-medium text-slate-400 uppercase tracking-widest mb-0.5 truncate">{label}</p>
      <p className="text-sm font-semibold text-slate-800 tracking-tighter truncate">{value}</p>
    </div>
  </div>
);

export default Dashboard;
