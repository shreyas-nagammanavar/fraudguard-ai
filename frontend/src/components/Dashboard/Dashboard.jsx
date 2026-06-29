import React, { useEffect, useState } from 'react';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale,
  BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import {
  ShieldExclamationIcon, CheckCircleIcon, CreditCardIcon,
  ChartBarIcon, ArrowTrendingUpIcon, CpuChipIcon,
} from '@heroicons/react/24/outline';
import API from '../../utils/api';
import { StatCard, CardSkeleton, RiskBadge, FraudBadge, Spinner } from '../UI';
import { fmt, chartDefaults } from '../../utils/helpers';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler);

const modelColors = {
  'Random Forest':    '#6366f1',
  'XGBoost':         '#22c55e',
  'Logistic Regression': '#f59e0b',
  'Decision Tree':   '#8b5cf6',
  'Isolation Forest':'#64748b',
};

export default function Dashboard() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/dashboard')
      .then(r => setData(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="space-y-6">
      <div className="h-8 skeleton rounded w-48 mb-6" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
      </div>
    </div>
  );

  const stats = data || {};
  const mm    = stats.model_metrics;

  // Fraud vs safe pie
  const pieData = {
    labels: ['Legitimate', 'Fraud'],
    datasets: [{
      data:            [stats.safe_count || 0, stats.fraud_count || 0],
      backgroundColor: ['rgba(34,197,94,0.8)', 'rgba(239,68,68,0.8)'],
      borderColor:     ['#22c55e', '#ef4444'],
      borderWidth:     2,
    }],
  };

  // Model comparison bar
  const modelLabels  = mm?.models?.map(m => m.name.replace('Logistic Regression', 'Log Reg')) || [];
  const modelBar = {
    labels: modelLabels,
    datasets: [
      { label: 'ROC-AUC (%)',  data: mm?.models?.map(m => m.roc_auc)  || [], backgroundColor: 'rgba(99,102,241,0.8)',  borderRadius: 4 },
      { label: 'F1 (%)',       data: mm?.models?.map(m => m.f1)       || [], backgroundColor: 'rgba(34,197,94,0.8)',   borderRadius: 4 },
      { label: 'Precision (%)',data: mm?.models?.map(m => m.precision) || [], backgroundColor: 'rgba(245,158,11,0.8)', borderRadius: 4 },
      { label: 'Recall (%)',   data: mm?.models?.map(m => m.recall)    || [], backgroundColor: 'rgba(139,92,246,0.8)', borderRadius: 4 },
    ],
  };

  const chartOpts = {
    ...chartDefaults,
    plugins: { ...chartDefaults.plugins, legend: { ...chartDefaults.plugins.legend, position: 'bottom' } },
    responsive: true, maintainAspectRatio: false,
  };

  return (
    <div className="space-y-6 animate-slide-up">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-slate-400 mt-1">Real-time fraud detection overview</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total Transactions" value={fmt.num(stats.total_transactions || 0)}
          icon={CreditCardIcon} color="brand"
          sub="All time predictions" />
        <StatCard title="Fraud Detected" value={fmt.num(stats.fraud_count || 0)}
          icon={ShieldExclamationIcon} color="red"
          sub={`${fmt.pct(stats.fraud_percentage || 0)} fraud rate`} />
        <StatCard title="Safe Transactions" value={fmt.num(stats.safe_count || 0)}
          icon={CheckCircleIcon} color="green"
          sub="Legitimate transactions" />
        <StatCard title="Avg Risk Score" value={fmt.score(stats.avg_risk_score || 0)}
          icon={ChartBarIcon} color="purple"
          sub={`Avg prob ${fmt.pct(stats.avg_fraud_prob || 0)}`} />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Fraud vs Safe Pie */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <ChartBarIcon className="w-4 h-4 text-brand-400" /> Fraud Distribution
          </h3>
          <div className="h-52 flex items-center justify-center">
            {(stats.total_transactions || 0) > 0
              ? <Doughnut data={pieData} options={{ ...chartOpts, scales: undefined }} />
              : <p className="text-slate-500 text-sm">No data yet</p>}
          </div>
        </div>

        {/* Model Metrics */}
        {mm && (
          <div className="glass-card p-6 lg:col-span-2">
            <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
              <CpuChipIcon className="w-4 h-4 text-brand-400" />
              Model Performance – <span className="text-brand-400">{mm.best_model}</span>
            </h3>
            <div className="h-52">
              <Bar data={modelBar} options={chartOpts} />
            </div>
          </div>
        )}
      </div>

      {/* Best model metrics */}
      {mm?.best_metrics && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4 flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-4 h-4 text-brand-400" />
            Best Model Metrics – <span className="text-brand-400">{mm.best_model}</span>
            <span className="ml-auto text-xs text-slate-500">Trained on {fmt.num(mm.train_samples)} samples</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { k: 'accuracy',  label: 'Accuracy' },
              { k: 'precision', label: 'Precision' },
              { k: 'recall',    label: 'Recall' },
              { k: 'f1',        label: 'F1 Score' },
              { k: 'roc_auc',   label: 'ROC-AUC' },
              { k: 'avg_precision', label: 'Avg Precision' },
            ].map(({ k, label }) => (
              <div key={k} className="bg-dark-700/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-bold gradient-text">
                  {fmt.pct(mm.best_metrics[k] || 0)}
                </p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent transactions */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Recent Predictions</h3>
        {(stats.recent_transactions || []).length === 0
          ? <p className="text-slate-500 text-sm text-center py-8">No predictions yet. Upload a CSV to get started.</p>
          : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 uppercase border-b border-white/5">
                  <th className="pb-3 text-left">Transaction ID</th>
                  <th className="pb-3 text-left">Prediction</th>
                  <th className="pb-3 text-left">Risk Score</th>
                  <th className="pb-3 text-left">Prob</th>
                  <th className="pb-3 text-left">Risk Level</th>
                  <th className="pb-3 text-left">Amount</th>
                </tr>
              </thead>
              <tbody>
                {(stats.recent_transactions || []).map(tx => (
                  <tr key={tx.id} className="table-row">
                    <td className="py-3 font-mono text-xs text-slate-400">{tx.transaction_id}</td>
                    <td className="py-3"><FraudBadge isFraud={tx.is_fraud} /></td>
                    <td className="py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-dark-700 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-green-500 to-red-500"
                            style={{ width: `${tx.risk_score}%` }} />
                        </div>
                        <span className="text-slate-300 text-xs">{tx.risk_score}</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-300">{fmt.pct(tx.fraud_prob)}</td>
                    <td className="py-3"><RiskBadge score={tx.risk_score} level={tx.risk_level} /></td>
                    <td className="py-3 text-slate-300">{tx.amount ? fmt.usd(tx.amount) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
