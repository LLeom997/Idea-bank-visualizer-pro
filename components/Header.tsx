
import React from 'react';

const Header: React.FC = () => {
  return (
    <nav className="bg-white border-b border-slate-200 h-16 flex items-center px-6 justify-between flex-shrink-0 relative z-50">
      <div className="flex items-center gap-4">
        <div className="bg-indigo-600 w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-100 rotate-3 group hover:rotate-0 transition-transform cursor-pointer">
          <i className="fa-solid fa-flask-vial text-lg"></i>
        </div>
        <div>
          <h1 className="text-lg font-black text-slate-800 tracking-tighter leading-none">Idea Bank Pro</h1>
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.2em]">Engineering Intelligence v2.0</p>
          </div>
        </div>
      </div>
      
      <div className="flex items-center gap-6">
        <div className="hidden md:flex items-center gap-4 border-r border-slate-100 pr-6 mr-6">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold leading-none uppercase tracking-widest">Whirlpool Corp.</p>
            <p className="text-[9px] text-indigo-600 font-black mt-1">Enterprise Solution</p>
          </div>
        </div>
        <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-black text-indigo-600">
          IB
        </div>
      </div>
    </nav>
  );
};

export default Header;
