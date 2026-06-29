// Formatting and helper utilities

export const fmt = {
  pct: (v) => `${Number(v).toFixed(2)}%`,
  usd: (v) => `$${Number(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
  num: (v) => Number(v).toLocaleString('en-US'),
  score: (v) => `${Math.round(v)}/100`,
};

export function riskColor(score) {
  if (score <= 30)  return { text: 'text-green-400',  bg: 'bg-green-500/20',  border: 'border-green-500/30',  hex: '#22c55e' };
  if (score <= 60)  return { text: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30', hex: '#eab308' };
  if (score <= 80)  return { text: 'text-orange-400', bg: 'bg-orange-500/20', border: 'border-orange-500/30', hex: '#f97316' };
  return             { text: 'text-red-400',    bg: 'bg-red-500/20',    border: 'border-red-500/30',    hex: '#ef4444' };
}

export function fraudBadge(isFraud, riskLevel) {
  const map = {
    'Safe':          'badge-safe',
    'Medium Risk':   'badge-medium',
    'High Risk':     'badge-high',
    'Critical Fraud':'badge-critical',
  };
  return isFraud ? (map[riskLevel] || 'badge-fraud') : 'badge-safe';
}

export const chartDefaults = {
  plugins: {
    legend: { labels: { color: '#94a3b8', font: { family: 'Inter' } } },
    tooltip: {
      backgroundColor: '#1e1e35',
      borderColor: '#ffffff20',
      borderWidth: 1,
      titleColor: '#e2e8f0',
      bodyColor: '#94a3b8',
    },
  },
  scales: {
    x: { ticks: { color: '#64748b' }, grid: { color: '#ffffff08' } },
    y: { ticks: { color: '#64748b' }, grid: { color: '#ffffff08' } },
  },
};
