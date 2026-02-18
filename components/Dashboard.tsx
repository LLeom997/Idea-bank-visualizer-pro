
import React, { useMemo, useState, useEffect, useRef } from 'react';
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
  startDate: string;
  endDate: string;
}

type SortConfig = {
  key: 'savings' | null;
  direction: 'asc' | 'desc';
};

const COLORS = [
  '#2DC3E0', '#27B45E', '#F7941D', '#EC1D26', 
  '#6366F1', '#A855F7', '#EC4899', '#14B8A6', 
  '#F59E0B', '#10B981', '#06B6D4', '#3B82F6', 
  '#8B5CF6', '#D946EF', '#84CC16', '#EAB308', 
  '#64748B', '#0F172A', '#94A3B8', '#475569'
];

const Dashboard: React.FC<DashboardProps> = ({ data, onReset }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [agendaInput, setAgendaInput] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig>({ key: 'savings', direction: 'desc' });
  const agendaTableRef = useRef<HTMLDivElement>(null);
  
  const options = useMemo(() => ({
    subsystems: getUniqueOptions(data, 'subsystem'),
    platforms: getUniqueOptions(data, 'platform'),
    statuses: getUniqueOptions(data, 'status'),
  }), [data]);

  const [filters, setFilters] = useState<FilterCriteria>(() => {
    const today = new Date().toISOString().split('T')[0];
    const defaultStart = '2026-01-01';
    const defaultSubsystems = ['Chassis', 'Packaging'];
    const defaultPlatforms = ['Fsr', 'Wo', 'Ct', 'Mwo'];
    const allStatuses = options.statuses.map(([name]) => name);
    const defaultStatuses = allStatuses.filter(s => !s.toLowerCase().includes('reject'));

    return {
      subsystems: defaultSubsystems,
      platforms: defaultPlatforms,
      statuses: defaultStatuses,
      startDate: defaultStart,
      endDate: today
    };
  });

  useEffect(() => {
    if (data.length > 0 && filters.statuses.length === 0) {
      const allStatuses = options.statuses.map(([name]) => name);
      const defaultStatuses = allStatuses.filter(s => !s.toLowerCase().includes('reject'));
      setFilters(prev => ({ ...prev, statuses: defaultStatuses }));
    }
  }, [options.statuses, data.length]);

  const filteredData = useMemo(() => {
    const start = new Date(filters.startDate);
    const end = new Date(filters.endDate);
    end.setHours(23, 59, 59, 999);

    return data.filter(item => {
      const matchDate = item.date >= start && item.date <= end;
      const matchSub = filters.subsystems.length === 0 || filters.subsystems.includes(item.subsystem);
      const matchPlat = filters.platforms.length === 0 || filters.platforms.includes(item.platform);
      const matchStat = filters.statuses.length === 0 || filters.statuses.includes(item.status);
      return matchDate && matchSub && matchPlat && matchStat;
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

  // Agenda logic
  const selectedAgendaItems = useMemo(() => {
    const ids = agendaInput.split(/[\s,]+/).map(id => id.trim()).filter(id => id.length > 0);
    return data.filter(item => ids.includes(item.id));
  }, [agendaInput, data]);

  const copyAgendaToClipboard = async () => {
    if (!agendaTableRef.current) return;
    try {
      const blob = new Blob([agendaTableRef.current.innerHTML], { type: 'text/html' });
      const plainTextBlob = new Blob([selectedAgendaItems.map(i => `ID ${i.id}: ${i.title} (Status: ${i.status})`).join('\n')], { type: 'text/plain' });
      await navigator.clipboard.write([
        new ClipboardItem({
          'text/html': blob,
          'text/plain': plainTextBlob
        })
      ]);
      alert('Agenda table copied! You can now paste it into Gmail.');
    } catch (err) {
      console.error('Failed to copy agenda', err);
      alert('Copy failed. Please try manually selecting and copying the table below.');
    }
  };

  const totalSavings = useMemo(() => filteredData.reduce((a, b) => a + b.savings, 0), [filteredData]);
  const avgSavings = useMemo(() => filteredData.length ? totalSavings / filteredData.length : 0, [filteredData, totalSavings]);

  const toggleFilter = (key: keyof FilterCriteria, value: any) => {
    setFilters(prev => {
      const current = (prev as any)[key];
      if (!Array.isArray(current)) return prev;
      const next = current.includes(value) ? current.filter(v => v !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  };

  const formatCurrency = (v: number) => new Intl.NumberFormat('en-US', { 
    style: 'currency', currency: 'USD', maximumFractionDigits: 0 
  }).format(v);

  const formatDate = (date: Date) => date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

  return (
    <div className="flex flex-row h-full w-full overflow-hidden bg-slate-50 font-sans">
      <aside className="w-64 flex-shrink-0 bg-white border-r border-slate-200 flex flex-col h-full z-20 shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Configuration</h3>
          <button onClick={() => setFilters({ ...filters, subsystems: [], platforms: [], statuses: [] })} className="text-[10px] text-slate-400 font-semibold hover:text-[#2DC3E0] transition-colors">Reset</button>
        </div>
        <div className="flex-grow overflow-y-auto p-4 space-y-8 custom-scrollbar">
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-50 pb-1">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">Submission Range</label>
            </div>
            <div className="space-y-2">
              <input type="date" value={filters.startDate} onChange={(e) => setFilters(f => ({...f, startDate: e.target.value}))} className="w-full text-xs border border-slate-200 rounded-md p-2 outline-none focus:ring-1 focus:ring-[#2DC3E0] bg-slate-50 shadow-sm" />
              <input type="date" value={filters.endDate} onChange={(e) => setFilters(f => ({...f, endDate: e.target.value}))} className="w-full text-xs border border-slate-200 rounded-md p-2 outline-none focus:ring-1 focus:ring-[#2DC3E0] bg-slate-50 shadow-sm" />
            </div>
          </section>
          <FilterGroup label="Subsystems" options={options.subsystems} active={filters.subsystems} onToggle={v => toggleFilter('subsystems', v)} onSelectAll={() => setFilters(p => ({...p, subsystems: options.subsystems.map(o => o[0])}))} onDeselectAll={() => setFilters(p => ({...p, subsystems: []}))} />
          <FilterGroup label="Platforms" options={options.platforms} active={filters.platforms} onToggle={v => toggleFilter('platforms', v)} uppercase onSelectAll={() => setFilters(p => ({...p, platforms: options.platforms.map(o => o[0])}))} onDeselectAll={() => setFilters(p => ({...p, platforms: []}))} />
          <FilterGroup label="Workflow Status" options={options.statuses} active={filters.statuses} onToggle={v => toggleFilter('statuses', v)} onSelectAll={() => setFilters(p => ({...p, statuses: options.statuses.map(o => o[0])}))} onDeselectAll={() => setFilters(p => ({...p, statuses: []}))} />
        </div>
        <div className="p-4 border-t border-slate-100">
          <button onClick={onReset} className="w-full py-2 bg-slate-50 border border-slate-200 text-slate-400 rounded-lg text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all flex items-center justify-center gap-2">Disconnect Source</button>
        </div>
      </aside>

      <main className="flex-grow flex flex-col h-full overflow-hidden p-6 space-y-6">
        <div className="grid grid-cols-4 gap-4 flex-shrink-0 animate-fade-in">
          <MiniKpi label="Active Submissions" value={filteredData.length.toLocaleString()} icon="fa-lightbulb" color="text-[#F7941D]" bg="bg-white" />
          <MiniKpi label="Total Savings Potential" value={formatCurrency(totalSavings)} icon="fa-chart-simple" color="text-[#27B45E]" bg="bg-white" />
          <MiniKpi label="Mean Idea Value" value={formatCurrency(avgSavings)} icon="fa-calculator" color="text-[#2DC3E0]" bg="bg-white" />
          <MiniKpi label="Project Leads" value={new Set(filteredData.map(i => i.submitter)).size.toString()} icon="fa-user-group" color="text-indigo-400" bg="bg-white" />
        </div>

        <div className="flex items-center justify-between animate-fade-in delay-100">
          <div className="flex gap-3">
            <button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#2DC3E0] text-white rounded-lg text-xs font-bold shadow-lg shadow-cyan-100 hover:brightness-105 transition-all active:scale-95 uppercase tracking-wide">
              <i className="fa-solid fa-chart-pie text-[10px]"></i> Visual Analytics
            </button>
            <button onClick={() => setIsAgendaModalOpen(true)} className="flex items-center gap-2 px-5 py-2.5 bg-[#27B45E] text-white rounded-lg text-xs font-bold shadow-lg shadow-green-100 hover:brightness-105 transition-all active:scale-95 uppercase tracking-wide">
              <i className="fa-solid fa-envelope text-[10px]"></i> Agenda Generator
            </button>
          </div>
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-full border border-slate-200 shadow-sm">
            <div className="w-2 h-2 bg-[#27B45E] rounded-full animate-pulse"></div>
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Enterprise Cloud Connected</span>
          </div>
        </div>

        <div className="flex-grow bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col overflow-hidden min-h-0 animate-slide-up">
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-8 flex-grow">
              <h4 className="text-[11px] font-bold text-slate-500 tracking-widest uppercase">Idea Repository</h4>
              <div className="relative flex-grow max-w-sm">
                <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 text-xs"></i>
                <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Filter by Project, ID, or Owner..." className="w-full bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-4 py-2 text-xs outline-none focus:ring-1 focus:ring-[#2DC3E0] transition-all shadow-inner"/>
              </div>
            </div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
              <span className="text-[#2DC3E0]">{searchedAndSortedData.length}</span> Records Found
            </div>
          </div>
          
          <div className="flex-grow overflow-auto custom-scrollbar">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-white text-slate-400 text-[10px] uppercase font-bold tracking-widest border-b border-slate-100 z-10">
                <tr>
                  <th className="px-6 py-4 font-bold">ID</th>
                  <th className="px-6 py-4 font-bold">Project / Submitter</th>
                  <th className="px-6 py-4 font-bold">Subsystem</th>
                  <th className="px-6 py-4 font-bold">Platform</th>
                  <th className="px-6 py-4 text-right font-bold cursor-pointer hover:text-[#2DC3E0] transition-colors" onClick={() => setSortConfig(prev => ({ key: 'savings', direction: prev.direction === 'asc' ? 'desc' : 'asc' }))}>Potential ($) {sortConfig.key === 'savings' && (sortConfig.direction === 'asc' ? '↑' : '↓')}</th>
                  <th className="px-6 py-4 text-center font-bold">Submitted Date</th>
                  <th className="px-6 py-4 text-center font-bold">Status</th>
                  <th className="px-6 py-4 text-center font-bold">G0 Form</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-[12px] text-slate-600">
                {searchedAndSortedData.map((item) => (
                  <tr key={item.id} className="transition-colors group border-b border-slate-50">
                    <td className="px-6 py-4 font-mono text-[10px] text-slate-400">{item.id}</td>
                    <td className="px-6 py-4"><div className="font-semibold text-slate-800 text-[12px]">{item.title}</div><div className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5"><i className="fa-solid fa-user text-[9px]"></i> {item.submitter}</div></td>
                    <td className="px-6 py-4 font-medium text-slate-500">{item.subsystem}</td>
                    <td className="px-6 py-4 uppercase font-bold text-slate-300 text-[10px] tracking-wider">{item.platform}</td>
                    <td className="px-6 py-4 text-right font-bold text-slate-700">{formatCurrency(item.savings)}</td>
                    <td className="px-6 py-4 text-center text-slate-500 font-medium">{formatDate(item.date)}</td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest border ${item.status.toLowerCase().includes('approved') ? 'bg-emerald-50 text-[#27B45E] border-[#27B45E]/20' : item.status.toLowerCase().includes('reject') ? 'bg-rose-50 text-[#EC1D26] border-[#EC1D26]/20' : 'bg-slate-50 text-slate-500 border-slate-100'}`}>
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.link ? (
                        <a href={item.link} target="_blank" rel="noopener noreferrer" className="w-9 h-9 rounded-lg bg-white border border-slate-200 flex items-center justify-center mx-auto text-[#2DC3E0] hover:bg-[#2DC3E0] hover:text-white hover:border-[#2DC3E0] hover:shadow-lg hover:shadow-cyan-100 transition-all"><i className="fa-solid fa-file-invoice text-xs"></i></a>
                      ) : <span className="text-slate-200 text-[10px] font-bold uppercase tracking-widest">N/A</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Agenda Generator Modal */}
        {isAgendaModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[6px]" onClick={() => setIsAgendaModalOpen(false)}></div>
            <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl relative flex flex-col animate-slide-up overflow-hidden border border-slate-200">
              <div className="p-6 border-b flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Meeting Agenda Generator</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Create Copyable Gmail Content</p>
                </div>
                <button onClick={() => setIsAgendaModalOpen(false)} className="w-8 h-8 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all"><i className="fa-solid fa-xmark"></i></button>
              </div>
              <div className="flex-grow p-8 overflow-auto custom-scrollbar flex flex-col gap-6">
                <div className="space-y-3">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-widest block">Input Idea IDs (Paste multiple separated by space/comma/line)</label>
                  <textarea 
                    value={agendaInput} 
                    onChange={(e) => setAgendaInput(e.target.value)} 
                    placeholder="e.g. 27012, 27045, 27101..." 
                    className="w-full h-24 bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm outline-none focus:ring-1 focus:ring-[#2DC3E0] transition-all resize-none"
                  ></textarea>
                </div>
                
                {selectedAgendaItems.length > 0 && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Agenda Preview</h4>
                      <button onClick={copyAgendaToClipboard} className="px-4 py-2 bg-[#2DC3E0] text-white text-[10px] font-bold rounded-lg uppercase tracking-widest shadow-lg shadow-cyan-100 hover:brightness-105 transition-all active:scale-95">
                        <i className="fa-solid fa-copy mr-2"></i> Copy Table for Gmail
                      </button>
                    </div>
                    <div className="border border-slate-100 rounded-xl bg-slate-50 p-6 overflow-x-auto">
                      <div ref={agendaTableRef}>
                        <table style={{width:'100%', borderCollapse:'collapse', border:'1px solid #e2e8f0', fontFamily:'Inter, sans-serif', fontSize:'13px', background:'#ffffff'}}>
                          <thead>
                            <tr style={{background:'#f8fafc', textAlign:'left', borderBottom:'1px solid #e2e8f0'}}>
                              <th style={{padding:'12px', color:'#64748b', fontSize:'11px', textTransform:'uppercase', fontWeight:'bold', borderRight:'1px solid #e2e8f0'}}>ID</th>
                              <th style={{padding:'12px', color:'#64748b', fontSize:'11px', textTransform:'uppercase', fontWeight:'bold', borderRight:'1px solid #e2e8f0'}}>Project Title</th>
                              <th style={{padding:'12px', color:'#64748b', fontSize:'11px', textTransform:'uppercase', fontWeight:'bold', borderRight:'1px solid #e2e8f0'}}>Subsystem</th>
                              <th style={{padding:'12px', color:'#64748b', fontSize:'11px', textTransform:'uppercase', fontWeight:'bold', borderRight:'1px solid #e2e8f0'}}>Potential ($)</th>
                              <th style={{padding:'12px', color:'#64748b', fontSize:'11px', textTransform:'uppercase', fontWeight:'bold', borderRight:'1px solid #e2e8f0'}}>Status</th>
                              <th style={{padding:'12px', color:'#64748b', fontSize:'11px', textTransform:'uppercase', fontWeight:'bold'}}>G0 Link</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedAgendaItems.map(item => (
                              <tr key={item.id} style={{borderBottom:'1px solid #f1f5f9'}}>
                                <td style={{padding:'10px 12px', color:'#94a3b8', borderRight:'1px solid #f1f5f9'}}>{item.id}</td>
                                <td style={{padding:'10px 12px', fontWeight:'600', color:'#1e293b', borderRight:'1px solid #f1f5f9'}}>{item.title}</td>
                                <td style={{padding:'10px 12px', color:'#64748b', borderRight:'1px solid #f1f5f9'}}>{item.subsystem}</td>
                                <td style={{padding:'10px 12px', textAlign:'right', fontWeight:'bold', color:'#334155', borderRight:'1px solid #f1f5f9'}}>{formatCurrency(item.savings)}</td>
                                <td style={{padding:'10px 12px', borderRight:'1px solid #f1f5f9'}}>
                                  <span style={{padding:'2px 8px', borderRadius:'4px', fontSize:'10px', fontWeight:'bold', textTransform:'uppercase', background:'#f8fafc', color:'#64748b', border:'1px solid #e2e8f0'}}>
                                    {item.status}
                                  </span>
                                </td>
                                <td style={{padding:'10px 12px'}}>
                                  {item.link ? (
                                    <a href={item.link} target="_blank" rel="noopener noreferrer" style={{color:'#2DC3E0', fontWeight:'bold', textDecoration:'none'}}>
                                      Pre-G0 ID: {item.id}
                                    </a>
                                  ) : <span style={{color:'#cbd5e1', fontSize:'10px'}}>N/A</span>}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
                {agendaInput && selectedAgendaItems.length === 0 && (
                  <div className="py-12 text-center text-slate-400">
                    <i className="fa-solid fa-circle-question text-3xl mb-4 block opacity-20"></i>
                    <p className="text-sm font-medium">No matching ideas found for the provided IDs.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Intelligence Dashboard Modal */}
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 animate-fade-in">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-[6px]" onClick={() => setIsModalOpen(false)}></div>
            <div className="bg-white w-full max-w-6xl h-[85vh] rounded-2xl shadow-2xl relative flex flex-col animate-slide-up overflow-hidden border border-slate-200">
              <div className="p-6 border-b flex items-center justify-between bg-white z-10">
                <div><h2 className="text-2xl font-bold text-slate-800 tracking-tight">Intelligence Dashboard</h2><p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Cross-Functional Distribution Analysis</p></div>
                <button onClick={() => setIsModalOpen(false)} className="w-10 h-10 rounded-full border border-slate-200 flex items-center justify-center text-slate-400 hover:bg-slate-50 transition-all"><i className="fa-solid fa-xmark text-lg"></i></button>
              </div>
              <div className="flex-grow p-8 grid grid-cols-1 lg:grid-cols-2 gap-8 overflow-auto custom-scrollbar bg-slate-50">
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-[400px] flex flex-col">
                  <div className="flex items-center justify-between mb-6"><h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Savings Contribution by Subsystem</h4></div>
                  <div className="flex-grow">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={prepareSubsystemData(filteredData)}>
                        <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} interval={0} angle={-15} textAnchor="end" stroke="#94a3b8"/>
                        <YAxis fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `$${v/1000}k`} stroke="#94a3b8"/>
                        <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius:'12px', border:'1px solid #e2e8f0', fontSize: '11px', fontWeight: 'bold'}}/>
                        <Bar dataKey="value" fill="#2DC3E0" radius={[6,6,0,0]} barSize={32}/>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm h-[400px] flex flex-col">
                  <div className="flex items-center justify-between mb-6"><h4 className="text-[11px] font-bold uppercase tracking-widest text-slate-500">Global Workflow Segmentation</h4></div>
                  <div className="flex-grow">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={prepareStatusData(filteredData)} dataKey="value" cx="50%" cy="50%" innerRadius={70} outerRadius={100} paddingAngle={5} stroke="#fff" strokeWidth={3}>
                          {prepareStatusData(filteredData).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]}/>)}
                        </Pie>
                        <Tooltip contentStyle={{borderRadius:'12px', border:'none', boxShadow:'0 20px 25px -5px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold'}}/>
                        <Legend verticalAlign="bottom" height={48} wrapperStyle={{fontSize:'9px', fontWeight:'700', textTransform:'uppercase', paddingTop: '20px', letterSpacing: '0.05em'}}/>
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
  return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a,b) => b.value - a.value).slice(0, 10);
};

const prepareStatusData = (data: Idea[]) => {
  const map: Record<string, number> = {};
  data.forEach(i => map[i.status] = (map[i.status] || 0) + 1);
  return Object.entries(map).map(([name, value]) => ({ name, value }));
};

const FilterGroup: React.FC<{ 
  label: string; options: [string, number][]; active: string[]; onToggle: (v: string) => void; onSelectAll: () => void; onDeselectAll: () => void; uppercase?: boolean; 
}> = ({ label, options, active, onToggle, onSelectAll, onDeselectAll, uppercase }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between border-b border-slate-50 pb-1">
      <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">{label}</label>
      <div className="flex gap-2">
        <button onClick={onSelectAll} className="text-[9px] text-[#2DC3E0] font-bold uppercase hover:brightness-90 transition-all">All</button>
        <button onClick={onDeselectAll} className="text-[9px] text-slate-300 font-bold uppercase hover:text-slate-500">None</button>
      </div>
    </div>
    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
      {options.map(([name, count]) => (
        <label key={name} className="flex items-center gap-2.5 cursor-pointer group py-0.5">
          <input type="checkbox" checked={active.includes(name)} onChange={() => onToggle(name)} className="w-3.5 h-3.5 rounded border-slate-300 text-[#2DC3E0] focus:ring-0 focus:ring-offset-0 cursor-pointer" />
          <span className={`text-[11px] truncate flex-grow ${active.includes(name) ? 'text-slate-700 font-bold' : 'text-slate-400 group-hover:text-slate-600 transition-colors'} ${uppercase ? 'uppercase' : ''}`}>{name}</span>
          <span className="text-[9px] font-bold text-slate-300 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{count}</span>
        </label>
      ))}
    </div>
  </div>
);

const MiniKpi: React.FC<{ label: string; value: string; icon: string; color: string; bg: string }> = ({ label, value, icon, color, bg }) => (
  <div className={`${bg} border border-slate-200 rounded-xl p-5 flex items-center gap-5 shadow-sm hover:border-[#2DC3E0]/30 transition-all group cursor-default`}>
    <div className={`w-12 h-12 rounded-2xl bg-slate-50 flex items-center justify-center ${color} group-hover:scale-110 transition-transform`}><i className={`fa-solid ${icon} text-lg`}></i></div>
    <div className="min-w-0">
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest truncate mb-0.5">{label}</p>
      <p className="text-xl font-bold text-slate-800 tracking-tight truncate">{value}</p>
    </div>
  </div>
);

export default Dashboard;
