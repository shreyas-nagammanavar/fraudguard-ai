import React from 'react';
import { riskColor } from '../utils/helpers';

// ── Skeleton ──────────────────────────────────────────────────────
export function Skeleton({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

export function CardSkeleton() {
  return (
    <div className="glass-card p-6 animate-pulse">
      <div className="h-4 skeleton rounded w-2/3 mb-4" />
      <div className="h-8 skeleton rounded w-1/2 mb-2" />
      <div className="h-3 skeleton rounded w-1/3" />
    </div>
  );
}

// ── Stat Card ─────────────────────────────────────────────────────
export function StatCard({ title, value, sub, icon: Icon, color = 'brand', loading }) {
  const colorMap = {
    brand:  'from-brand-600/30 to-brand-500/10 text-brand-400',
    green:  'from-green-600/30 to-green-500/10 text-green-400',
    red:    'from-red-600/30 to-red-500/10 text-red-400',
    yellow: 'from-yellow-600/30 to-yellow-500/10 text-yellow-400',
    purple: 'from-purple-600/30 to-purple-500/10 text-purple-400',
  };
  if (loading) return <CardSkeleton />;
  return (
    <div className="glass-card-hover p-6 animate-slide-up">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">{title}</p>
          <p className="text-3xl font-bold text-white mt-1.5">{value}</p>
          {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl bg-gradient-to-br ${colorMap[color]}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}

// ── Risk Badge ────────────────────────────────────────────────────
export function RiskBadge({ score, level }) {
  const { text, bg, border } = riskColor(score);
  return (
    <span className={`badge ${bg} ${text} ${border}`}>
      <span className={`w-1.5 h-1.5 rounded-full bg-current`} />
      {level || score}
    </span>
  );
}

// ── Fraud Badge ───────────────────────────────────────────────────
export function FraudBadge({ isFraud, label }) {
  return isFraud
    ? <span className="badge-fraud">🚨 {label || 'Fraud'}</span>
    : <span className="badge-safe">✓ {label || 'Legitimate'}</span>;
}

// ── Risk Score Ring ───────────────────────────────────────────────
export function RiskRing({ score, size = 80 }) {
  const { hex } = riskColor(score);
  const r = 30;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8" stroke="rgba(255,255,255,0.05)" />
      <circle cx="40" cy="40" r={r} fill="none" strokeWidth="8"
        stroke={hex} strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        transform="rotate(-90 40 40)"
        style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
      />
      <text x="40" y="45" textAnchor="middle" fontSize="16" fontWeight="700" fill="white">
        {score}
      </text>
    </svg>
  );
}

// ── Empty State ───────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, desc }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
      <div className="w-16 h-16 bg-dark-700 rounded-2xl flex items-center justify-center">
        {Icon && <Icon className="w-8 h-8 text-slate-500" />}
      </div>
      <div>
        <p className="text-slate-300 font-semibold">{title}</p>
        {desc && <p className="text-slate-500 text-sm mt-1">{desc}</p>}
      </div>
    </div>
  );
}

// ── Page Header ───────────────────────────────────────────────────
export function PageHeader({ title, subtitle, action }) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <h1 className="text-2xl font-bold text-white">{title}</h1>
        {subtitle && <p className="text-sm text-slate-400 mt-1">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

// ── Spinner ───────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const s = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-10 h-10' : 'w-6 h-6';
  return (
    <div className={`${s} border-2 border-brand-500/30 border-t-brand-500 rounded-full animate-spin`} />
  );
}

// ── Pagination ────────────────────────────────────────────────────
export function Pagination({ page, pages, onPage }) {
  if (pages <= 1) return null;
  return (
    <div className="flex items-center gap-2 justify-center mt-4">
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}
        className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40">← Prev</button>
      <span className="text-sm text-slate-400 px-2">{page} / {pages}</span>
      <button disabled={page >= pages} onClick={() => onPage(page + 1)}
        className="btn-secondary py-1.5 px-3 text-sm disabled:opacity-40">Next →</button>
    </div>
  );
}
