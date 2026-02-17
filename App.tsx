
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
          submitter: (row["REQUESTER EMAIL"] || 'anonymous@enterprise.com').trim(),
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
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col overflow-hidden bg-slate-50 font-normal">
      <Header />
      <main className="flex-grow flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        {!data.length && !loading && (
          <div className="flex-grow flex items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl p-10 border border-slate-200 text-center animate-in fade-in zoom-in duration-300">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <i className="fa-solid fa-cloud-arrow-down text-3xl"></i>
              </div>
              <h2 className="text-3xl font-semibold text-slate-800 mb-2 tracking-tighter">Idea Intelligence</h2>
              <p className="text-slate-500 mb-8 text-sm font-normal leading-relaxed">
                Unlock cross-platform engineering insights by connecting your Google Sheets data.
              </p>
              <UrlInput onSubmit={handleUrlSubmit} isLoading={loading} />
              {error && (
                <div className="mt-8 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl text-xs font-semibold flex items-center gap-3">
                  <i className="fa-solid fa-circle-exclamation"></i>
                  {error}
                </div>
              )}
            </div>
          </div>
        )}
        
        {loading && (
          <div className="flex-grow flex flex-col items-center justify-center">
            <div className="relative mb-6">
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-100 border-t-indigo-600"></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <i className="fa-solid fa-gear text-indigo-600 text-[10px] animate-pulse"></i>
              </div>
            </div>
            <p className="text-slate-400 font-medium uppercase tracking-[0.3em] text-[10px]">Processing Data...</p>
          </div>
        )}

        {data.length > 0 && !loading && <Dashboard data={data} onReset={() => setData([])} />}
      </main>
    </div>
  );
};

export default App;
