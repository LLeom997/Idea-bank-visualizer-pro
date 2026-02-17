
import React, { useState } from 'react';
import { Idea } from './types';
import Dashboard from './components/Dashboard';
import UrlInput from './components/UrlInput';
import Header from './components/Header';

const App: React.FC = () => {
  const [data, setData] = useState<Idea[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const processData = (csvText: string): Idea[] => {
    const lines = csvText.split('\n');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
    
    return lines.slice(1)
      .filter(line => line.trim().length > 0)
      .map(line => {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"' && line[i+1] === '"') {
            current += '"';
            i++;
          } else if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            values.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        values.push(current.trim());

        const row: any = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });

        const id = row["IDEA BANK ID"]?.trim();
        const rawDate = row["SUBMIT DATE"]?.trim();
        const rawSavings = row["TOTAL SAVINGS"]?.trim();

        if (!id || !rawDate || !rawSavings || id === "" || rawDate === "" || rawSavings === "") {
          return null;
        }

        const savings = parseFloat(rawSavings.replace(/[$,]/g, ''));
        if (isNaN(savings) || savings <= 0) {
          return null;
        }

        const parsedDate = new Date(rawDate);
        if (isNaN(parsedDate.getTime())) {
          return null;
        }

        const normalize = (val: string) => {
          if (!val) return 'Unknown';
          const trimmed = val.trim();
          if (trimmed === "") return 'Unknown';
          return trimmed.toLowerCase()
            .split(/[\s/]+/)
            .map(w => w.charAt(0).toUpperCase() + w.slice(1))
            .join(' ')
            .replace(/\b\w/g, c => c.toUpperCase());
        };

        return {
          id,
          title: (row["PROJECT TITLE"] || 'Untitled Project').trim(),
          subsystem: normalize(row["SUBSYSTEM"]),
          region: normalize(row["REGION"]),
          platform: normalize(row["PLATFORM"]),
          plant: normalize(row["PLANT"]),
          status: normalize(row["FINAL STATUS"]),
          date: parsedDate,
          submitter: (row["REQUESTER EMAIL"] || 'system@enterprise.com').trim(),
          scopingLeader: normalize(row["SCOPING LEADER"]),
          savings: savings,
          link: (row["LINK"] || '').trim()
        };
      })
      .filter((item): item is Idea => item !== null);
  };

  const handleUrlSubmit = async (url: string) => {
    setLoading(true);
    setError(null);
    try {
      let exportUrl = url;
      if (url.includes('/edit')) {
        exportUrl = url.replace(/\/edit.*$/, '/export?format=csv');
      } else if (!url.includes('export?format=csv')) {
        if (url.length > 20 && !url.includes('http')) {
          exportUrl = `https://docs.google.com/spreadsheets/d/${url}/export?format=csv`;
        }
      }

      const response = await fetch(exportUrl);
      if (!response.ok) throw new Error('Could not access spreadsheet. Ensure it is public.');
      
      const csvText = await response.text();
      const processed = processData(csvText);
      if (processed.length === 0) throw new Error('No valid data found in spreadsheet.');
      setData(processed);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during import.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-slate-50 font-sans">
      <Header />
      <main className="flex-grow flex flex-col h-[calc(100vh-56px)] overflow-hidden">
        {!data.length && !loading && (
          <div className="flex-grow flex items-center justify-center p-4">
            <div className="max-w-sm w-full bg-white rounded-2xl shadow-xl p-10 border border-slate-200 text-center animate-fade-in">
              <div className="w-14 h-14 bg-slate-50 text-slate-900 rounded-xl flex items-center justify-center mx-auto mb-6 border border-slate-100 shadow-sm">
                <i className="fa-solid fa-database text-xl"></i>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2 tracking-tight">Connect Repository</h2>
              <p className="text-slate-500 mb-8 text-xs font-medium leading-relaxed">
                Analyze engineering cost savings and performance across subsystems using your centralized spreadsheet data.
              </p>
              <UrlInput onSubmit={handleUrlSubmit} isLoading={loading} />
              {error && (
                <div className="mt-6 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg text-[10px] font-semibold flex items-center gap-2">
                  <i className="fa-solid fa-triangle-exclamation"></i>
                  {error}
                </div>
              )}
            </div>
          </div>
        )}
        
        {loading && (
          <div className="flex-grow flex flex-col items-center justify-center animate-fade-in">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-200 border-t-slate-900"></div>
              <p className="text-slate-500 font-semibold uppercase tracking-widest text-[10px]">Processing Environment...</p>
            </div>
          </div>
        )}

        {data.length > 0 && !loading && <Dashboard data={data} onReset={() => setData([])} />}
      </main>
    </div>
  );
};

export default App;
