import React, { useEffect, useState } from 'react';
import { Bar, Doughnut, Line, Scatter } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, CategoryScale, LinearScale,
  BarElement, PointElement, LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';
import { ChartBarIcon } from '@heroicons/react/24/outline';
import API from '../../utils/api';
import { CardSkeleton, EmptyState, FraudBadge, RiskBadge, PageHeader } from '../UI';
import { fmt, chartDefaults } from '../../utils/helpers';

ChartJS.register(ArcElement, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Title, Tooltip, Legend, Filler);

const opts = (title) => ({
  ...chartDefaults,
  responsive: true, maintainAspectRatio: false,
  plugins: { ...chartDefaults.plugins, title: { display: !!title, text: title, color: '#94a3b8' } },
});

export default function Analytics() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get('/analytics').then(r => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {[...Array(6)].map((_, i) => <CardSkeleton key={i} />)}
    </div>
  );

  if (!data || data.fraud_pct === 0 && data.hourly_fraud.length === 0) {
    return (
      <div className="animate-slide-up">
        <PageHeader title="Analytics" subtitle="Fraud trend analysis and risk distribution" />
        <EmptyState icon={ChartBarIcon} title="No analytics data"
          desc="Upload a CSV and run predictions to populate analytics." />
      </div>
    );
  }

  // Hourly bar
  const hourlyBar = {
    labels: data.hourly_fraud.map(h => `${h.hour}:00`),
    datasets: [
      { label: 'Fraud',  data: data.hourly_fraud.map(h => h.fraud), backgroundColor: 'rgba(239,68,68,0.8)',   borderRadius: 3 },
      { label: 'Safe',   data: data.hourly_fraud.map(h => h.safe),  backgroundColor: 'rgba(34,197,94,0.4)',  borderRadius: 3 },
    ],
  };

  // Daily trend
  const dailyLine = {
    labels: data.daily_trend.map(d => d.date),
    datasets: [
      { label: 'Fraud', data: data.daily_trend.map(d => d.fraud),
        borderColor: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)',
        tension: 0.4, fill: true, pointRadius: 3 },
      { label: 'Safe', data: data.daily_trend.map(d => d.safe),
        borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.05)',
        tension: 0.4, fill: true, pointRadius: 3 },
    ],
  };

  // Amount distribution
  const amtBar = {
    labels: data.amount_distribution.map(b => b.range),
    datasets: [
      { label: 'All Transactions',  data: data.amount_distribution.map(b => b.count),       backgroundColor: 'rgba(99,102,241,0.7)', borderRadius: 3 },
      { label: 'Fraud Transactions', data: data.fraud_amount_distribution.map(b => b.count), backgroundColor: 'rgba(239,68,68,0.7)',  borderRadius: 3 },
    ],
  };

  // Risk distribution doughnut
  const riskPie = {
    labels: ['Safe (0-30)', 'Medium (31-60)', 'High (61-80)', 'Critical (81-100)'],
    datasets: [{
      data: [data.risk_distribution.safe, data.risk_distribution.medium,
             data.risk_distribution.high, data.risk_distribution.critical],
      backgroundColor: ['rgba(34,197,94,0.8)', 'rgba(234,179,8,0.8)',
                         'rgba(249,115,22,0.8)', 'rgba(239,68,68,0.8)'],
      borderWidth: 2,
      borderColor:     ['#22c55e','#eab308','#f97316','#ef4444'],
    }],
  };

  // Fraud vs safe pie
  const fraudPie = {
    labels: ['Safe', 'Fraud'],
    datasets: [{
      data: [100 - data.fraud_pct, data.fraud_pct],
      backgroundColor: ['rgba(34,197,94,0.8)', 'rgba(239,68,68,0.8)'],
      borderColor:     ['#22c55e','#ef4444'],
      borderWidth: 2,
    }],
  };

  const chartH = 'h-60';

  return (
    <div className="space-y-6 animate-slide-up">
      <PageHeader title="Analytics" subtitle="Comprehensive fraud analysis and trends" />

      {/* KPI row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Fraud Rate',    val: fmt.pct(data.fraud_pct),     color: 'text-red-400' },
          { label: 'Safe Rate',     val: fmt.pct(data.safe_pct),      color: 'text-green-400' },
          { label: 'Avg Amount',    val: fmt.usd(data.amount_stats.mean), color: 'text-brand-400' },
          { label: 'Max Amount',    val: fmt.usd(data.amount_stats.max),  color: 'text-purple-400' },
        ].map(({ label, val, color }) => (
          <div key={label} className="glass-card p-5 text-center">
            <p className={`text-2xl font-bold ${color}`}>{val}</p>
            <p className="text-xs text-slate-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Hourly */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Fraud by Hour of Day</h3>
          <div className={chartH}><Bar data={hourlyBar} options={opts()} /></div>
        </div>

        {/* Daily trend */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Daily Fraud Trend</h3>
          <div className={chartH}><Line data={dailyLine} options={opts()} /></div>
        </div>

        {/* Amount dist */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Transaction Amount Distribution</h3>
          <div className={chartH}><Bar data={amtBar} options={{ ...opts(), indexAxis: undefined }} /></div>
        </div>

        {/* Risk distribution doughnut */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Risk Score Distribution</h3>
          <div className={chartH + ' flex items-center justify-center'}>
            <Doughnut data={riskPie} options={{ ...opts(), scales: undefined, responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Fraud pie */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Fraud vs Safe Split</h3>
          <div className={chartH + ' flex items-center justify-center'}>
            <Doughnut data={fraudPie} options={{ ...opts(), scales: undefined, responsive: true, maintainAspectRatio: false }} />
          </div>
        </div>

        {/* Top fraud hours */}
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Top Fraud Hours</h3>
          <div className="space-y-3">
            {data.top_fraud_hours.length === 0
              ? <p className="text-slate-500 text-sm text-center py-6">No data</p>
              : data.top_fraud_hours.map(({ hour, fraud_count }, i) => (
              <div key={hour} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-12">{hour}:00</span>
                <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-500/80 to-red-400 rounded-full"
                    style={{ width: `${(fraud_count / data.top_fraud_hours[0].fraud_count) * 100}%` }} />
                </div>
                <span className="text-xs text-red-400 w-8 text-right">{fraud_count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Most suspicious transactions */}
      {data.suspicious_top?.length > 0 && (
        <div className="glass-card p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Most Suspicious Transactions</h3>
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
                {data.suspicious_top.map(tx => (
                  <tr key={tx.id} className="table-row bg-red-500/5">
                    <td className="py-2.5 font-mono text-xs text-slate-400">{tx.transaction_id}</td>
                    <td className="py-2.5"><FraudBadge isFraud={tx.is_fraud} /></td>
                    <td className="py-2.5 text-red-400 font-bold">{tx.risk_score}</td>
                    <td className="py-2.5 text-red-400">{fmt.pct(tx.fraud_prob)}</td>
                    <td className="py-2.5"><RiskBadge score={tx.risk_score} level={tx.risk_level} /></td>
                    <td className="py-2.5 text-slate-300">{tx.amount ? fmt.usd(tx.amount) : '–'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
