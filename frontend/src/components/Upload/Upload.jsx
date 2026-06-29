import React, { useState, useRef, useCallback } from 'react';
import { ArrowUpTrayIcon, DocumentCheckIcon, XMarkIcon,
         TableCellsIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { Spinner, RiskBadge, FraudBadge, PageHeader } from '../UI';
import { fmt } from '../../utils/helpers';

const REQUIRED_COLS = ['TransactionDT', 'TransactionAmt'];

export default function Upload() {
  const [file,       setFile]       = useState(null);
  const [dragging,   setDragging]   = useState(false);
  const [preview,    setPreview]    = useState(null);    // { headers, rows }
  const [uploading,  setUploading]  = useState(false);
  const [result,     setResult]     = useState(null);
  const [error,      setError]      = useState('');
  const inputRef = useRef();

  const parsePreview = useCallback((f) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text  = e.target.result;
      const lines = text.trim().split('\n');
      if (lines.length < 2) return;
      const headers = lines[0].split(',').map(h => h.trim().replace(/"/g,''));
      const rows    = lines.slice(1, 6).map(l =>
        l.split(',').map(v => v.trim().replace(/"/g,''))
      );
      const missing = REQUIRED_COLS.filter(c => !headers.includes(c));
      if (missing.length) {
        setError(`Missing required columns: ${missing.join(', ')}`);
        setPreview(null);
      } else {
        setError('');
        setPreview({ headers: headers.slice(0, 10), rows });
      }
    };
    reader.readAsText(f);
  }, []);

  const handleFile = useCallback((f) => {
    if (!f) return;
    if (!f.name.endsWith('.csv')) { toast.error('Only .csv files accepted'); return; }
    setFile(f); setResult(null); setError('');
    parsePreview(f);
  }, [parsePreview]);

  const onDrop = (e) => {
    e.preventDefault(); setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const handleSubmit = async () => {
    if (!file || error) return;
    setUploading(true);
    const form = new FormData();
    form.append('file', file);
    try {
      const { data } = await API.post('/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      toast.success(`Analysed ${data.total} transactions!`);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally { setUploading(false); }
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); setError(''); };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-slide-up">
      <PageHeader title="Upload CSV" subtitle="Upload a transaction file to run batch fraud detection" />

      {/* Drop zone */}
      {!result && (
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onClick={() => !file && inputRef.current?.click()}
          className={`glass-card border-2 border-dashed transition-all duration-300 p-12 text-center cursor-pointer
            ${dragging   ? 'border-brand-500 bg-brand-500/10' :
              file       ? 'border-green-500/50 bg-green-500/5 cursor-default' :
                           'border-white/10 hover:border-brand-500/50 hover:bg-brand-500/5'}`}>
          <input ref={inputRef} type="file" accept=".csv" className="hidden"
            onChange={e => handleFile(e.target.files[0])} />

          {file ? (
            <div className="flex flex-col items-center gap-3">
              <DocumentCheckIcon className="w-12 h-12 text-green-400" />
              <div>
                <p className="font-semibold text-white">{file.name}</p>
                <p className="text-sm text-slate-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
              </div>
              <button onClick={e => { e.stopPropagation(); reset(); }}
                className="p-1.5 rounded-lg hover:bg-dark-600 text-slate-400 hover:text-white">
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-dark-700 rounded-2xl flex items-center justify-center">
                <ArrowUpTrayIcon className="w-8 h-8 text-brand-400" />
              </div>
              <div>
                <p className="font-semibold text-white">Drop your CSV here</p>
                <p className="text-sm text-slate-400 mt-1">or click to browse</p>
              </div>
              <p className="text-xs text-slate-500">
                Required columns: <code className="text-brand-400">TransactionDT, TransactionAmt</code>
              </p>
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-sm text-red-400">
          ⚠ {error}
        </div>
      )}

      {/* Preview table */}
      {preview && !result && (
        <div className="glass-card p-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <TableCellsIcon className="w-4 h-4 text-brand-400" /> Data Preview (first 5 rows)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-white/5">
                  {preview.headers.map(h => (
                    <th key={h} className="py-2 px-3 text-left text-slate-400 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, i) => (
                  <tr key={i} className="table-row">
                    {row.slice(0, preview.headers.length).map((cell, j) => (
                      <td key={j} className="py-2 px-3 text-slate-300 font-mono">{cell}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button onClick={handleSubmit} disabled={uploading || !!error}
            className="btn-primary mt-4 flex items-center gap-2">
            {uploading ? <><Spinner size="sm" /> Analysing…</> : <>🚀 Run Fraud Detection</>}
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <div className="space-y-6 animate-fade-in">
          {/* Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Total',    val: result.total,       color: 'text-white' },
              { label: 'Fraud',    val: result.fraud_count, color: 'text-red-400' },
              { label: 'Safe',     val: result.safe_count,  color: 'text-green-400' },
              { label: 'Fraud %',  val: fmt.pct(result.fraud_pct), color: 'text-yellow-400' },
            ].map(({ label, val, color }) => (
              <div key={label} className="glass-card p-5 text-center">
                <p className={`text-2xl font-bold ${color}`}>{val}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>

          {/* Success alert */}
          <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-4 flex items-center gap-3">
            <CheckCircleIcon className="w-5 h-5 text-green-400 flex-shrink-0" />
            <p className="text-sm text-green-300">
              Batch ID: <code className="text-green-400">{result.batch_id}</code> — All predictions stored in History.
            </p>
          </div>

          {/* Prediction table */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-slate-300">Prediction Results</h3>
              <button onClick={reset} className="btn-secondary py-1.5 px-3 text-xs">Upload Another</button>
            </div>
            <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-dark-800">
                  <tr className="text-xs text-slate-500 uppercase border-b border-white/5">
                    <th className="pb-3 text-left">#</th>
                    <th className="pb-3 text-left">Transaction ID</th>
                    <th className="pb-3 text-left">Prediction</th>
                    <th className="pb-3 text-left">Probability</th>
                    <th className="pb-3 text-left">Risk Score</th>
                    <th className="pb-3 text-left">Confidence</th>
                    <th className="pb-3 text-left">Risk Level</th>
                    <th className="pb-3 text-left">Recommendation</th>
                  </tr>
                </thead>
                <tbody>
                  {result.predictions.map((p, i) => (
                    <tr key={i} className={`table-row ${p.is_fraud ? 'bg-red-500/5' : ''}`}>
                      <td className="py-2.5 text-slate-500 text-xs">{i + 1}</td>
                      <td className="py-2.5 font-mono text-xs text-slate-400">{p.transaction_id}</td>
                      <td className="py-2.5"><FraudBadge isFraud={p.is_fraud} /></td>
                      <td className="py-2.5 font-semibold"
                        style={{ color: p.is_fraud ? '#ef4444' : '#22c55e' }}>
                        {fmt.pct(p.fraud_prob)}
                      </td>
                      <td className="py-2.5">
                        <div className="flex items-center gap-2">
                          <div className="w-14 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                            <div className="h-full rounded-full"
                              style={{ width: `${p.risk_score}%`,
                                       background: `linear-gradient(to right, #22c55e, #ef4444)` }} />
                          </div>
                          <span className="text-xs text-slate-300">{p.risk_score}</span>
                        </div>
                      </td>
                      <td className="py-2.5 text-slate-300 text-xs">{fmt.pct(p.confidence)}</td>
                      <td className="py-2.5"><RiskBadge score={p.risk_score} level={p.risk_level} /></td>
                      <td className="py-2.5 text-xs text-slate-400 max-w-xs truncate">{p.recommendation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
