
import React from 'react';

const Header: React.FC = () => {
  return (
    <nav className="bg-white border-b border-slate-200 h-14 flex items-center px-6 justify-between flex-shrink-0 relative z-50">
      <div className="flex items-center gap-3">
        <div className="bg-slate-900 w-8 h-8 rounded-lg flex items-center justify-center text-white shadow-sm transition-transform cursor-pointer">
          <i className="fa-solid fa-briefcase text-sm"></i>
        </div>
        <div>
          <h1 className="text-base font-semibold text-slate-900 tracking-tight leading-none">Idea Bank Pro</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full"></span>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Enterprise Intelligence</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-4 pr-4 border-r border-slate-100">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest">Global Operations</p>
            <p className="text-[9px] text-slate-600 font-medium">Standard Version 2.4.1</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-[11px] font-semibold text-slate-600">
            JD
          </div>
          <i className="fa-solid fa-chevron-down text-[10px] text-slate-300"></i>
        </div>
      </div>
    </nav>
  );
};

export default Header;
