import React, { useEffect, useState, useCallback } from 'react';
import {
  MagnifyingGlassIcon, TrashIcon, ArrowDownTrayIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { EmptyState, FraudBadge, RiskBadge, Pagination, Spinner, PageHeader } from '../UI';
import { fmt } from '../../utils/helpers';

export default function History() {
  const [rows,    setRows]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [page,    setPage]    = useState(1);
  const [loading, setLoading] = useState(true);
  const [search,  setSearch]  = useState('');
  const [filter,  setFilter]  = useState('all');
  const [sortBy,  setSortBy]  = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [deleting, setDeleting] = useState(null);

  const fetchHistory = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const { data } = await API.get('/history', {
        params: { page: p, per_page: 20, search, filter, sort_by: sortBy, sort_dir: sortDir }
      });
      setRows(data.items);
      setTotal(data.total);
      setPages(data.pages);
      setPage(data.page);
    } catch { toast.error('Failed to load history'); }
    finally   { setLoading(false); }
  }, [page, search, filter, sortBy, sortDir]);

  useEffect(() => { fetchHistory(1); }, [search, filter, sortBy, sortDir]);
  useEffect(() => { fetchHistory(page); }, [page]);

  const handleDelete = async (id) => {
    setDeleting(id);
    try {
      await API.delete(`/history/${id}`);
      toast.success('Record deleted');
      fetchHistory(page);
    } catch { toast.error('Delete failed'); }
    finally  { setDeleting(null); }
  };

  const handleExport = async () => {
    try {
      const res = await API.get('/history/export', {
        params: { filter }, responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a   = document.createElement('a');
      a.href = url; a.download = 'fraud_predictions.csv'; a.click();
      URL.revokeObjectURL(url);
    } catch { toast.error('Export failed'); }
  };

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortBy(col); setSortDir('desc'); }
  };

  const SortBtn = ({ col, label }) => (
    <button onClick={() => toggleSort(col)}
      className={`flex items-center gap-1 hover:text-white transition-colors ${sortBy===col?'text-brand-400':''}`}>
      {label}
      <span className="text-xs">{sortBy===col ? (sortDir==='desc'?'↓':'↑') : '↕'}</span>
    </button>
  );

  return (
    <div className="space-y-5 animate-slide-up">
      <PageHeader title="Transaction History"
        subtitle={`${total.toLocaleString()} total records`}
        action={
          <button onClick={handleExport} className="btn-secondary flex items-center gap-2 text-sm">
            <ArrowDownTrayIcon className="w-4 h-4" /> Export CSV
          </button>
        } />

      {/* Controls */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-48">
          <MagnifyingGlassIcon className="w-4 h-4 text-slate-500 absolute left-3 top-3.5" />
          <input className="input-field pl-9 py-3 text-sm" placeholder="Search transaction ID…"
            value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} />
        </div>
        <select value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }}
          className="input-field py-3 text-sm w-36">
          <option value="all">All</option>
          <option value="fraud">Fraud only</option>
          <option value="safe">Safe only</option>
        </select>
      </div>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase border-b border-white/5 bg-dark-800/50">
                {[
                  ['id','#'], ['transaction_id','Txn ID'],
                  ['prediction','Prediction'], ['fraud_prob','Prob'],
                  ['risk_score','Risk Score'], ['confidence','Confidence'],
                  ['risk_level','Risk Level'], ['amount','Amount'],
                  ['created_at','Date'],
                ].map(([col, label]) => (
                  <th key={col} className="py-3 px-4 text-left">
                    <SortBtn col={col} label={label} />
                  </th>
                ))}
                <th className="py-3 px-4 text-left">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    {[...Array(10)].map((_, j) => (
                      <td key={j} className="py-3 px-4">
                        <div className="h-4 skeleton rounded w-20" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : rows.length === 0 ? (
                <tr><td colSpan="10" className="py-0">
                  <EmptyState icon={ClockIcon} title="No history yet"
                    desc="Upload a CSV to run batch predictions" />
                </td></tr>
              ) : rows.map(row => (
                <tr key={row.id} className={`table-row ${row.is_fraud ? 'bg-red-500/3' : ''}`}>
                  <td className="py-3 px-4 text-slate-500 text-xs">{row.id}</td>
                  <td className="py-3 px-4 font-mono text-xs text-slate-400 max-w-32 truncate">{row.transaction_id}</td>
                  <td className="py-3 px-4"><FraudBadge isFraud={row.is_fraud} /></td>
                  <td className="py-3 px-4 font-medium" style={{ color: row.is_fraud ? '#ef4444' : '#22c55e' }}>
                    {fmt.pct(row.fraud_prob)}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <div className="w-12 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-red-500"
                          style={{ width: `${row.risk_score}%` }} />
                      </div>
                      <span className="text-xs text-slate-300">{row.risk_score}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-slate-400 text-xs">{fmt.pct(row.confidence)}</td>
                  <td className="py-3 px-4"><RiskBadge score={row.risk_score} level={row.risk_level} /></td>
                  <td className="py-3 px-4 text-slate-300 text-xs">{row.amount ? fmt.usd(row.amount) : '–'}</td>
                  <td className="py-3 px-4 text-slate-500 text-xs">
                    {row.created_at ? new Date(row.created_at).toLocaleString() : '–'}
                  </td>
                  <td className="py-3 px-4">
                    <button onClick={() => handleDelete(row.id)}
                      disabled={deleting === row.id}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors">
                      {deleting === row.id ? <Spinner size="sm" /> : <TrashIcon className="w-4 h-4" />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!loading && rows.length > 0 && (
          <div className="px-4 py-3 border-t border-white/5">
            <Pagination page={page} pages={pages} onPage={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
