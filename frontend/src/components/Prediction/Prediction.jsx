import React, { useState } from 'react';
import { CpuChipIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { Spinner, RiskBadge, RiskRing, FraudBadge, PageHeader } from '../UI';
import { fmt } from '../../utils/helpers';

const FIELDS = [
  { key: 'TransactionDT',  label: 'Transaction DT',  type: 'number', default: 86400,  hint: 'Seconds from reference' },
  { key: 'TransactionAmt', label: 'Amount ($)',       type: 'number', default: 100,    hint: 'Transaction amount' },
  { key: 'ProductCD',      label: 'Product Code',     type: 'text',   default: 'W',    hint: 'W/H/C/S/R' },
  { key: 'card1',          label: 'Card 1',           type: 'number', default: 4305,   hint: 'Card identifier' },
  { key: 'card4',          label: 'Card Network',     type: 'text',   default: 'visa', hint: 'visa/mastercard/discover/amex' },
  { key: 'card6',          label: 'Card Type',        type: 'text',   default: 'debit',hint: 'debit/credit' },
  { key: 'addr1',          label: 'Billing Zip',      type: 'number', default: 315,    hint: '' },
  { key: 'P_emaildomain',  label: 'Purchaser Email',  type: 'text',   default: 'gmail.com', hint: '' },
  { key: 'C1',             label: 'C1 Feature',       type: 'number', default: 1,      hint: '' },
  { key: 'D1',             label: 'D1 Feature',       type: 'number', default: 14,     hint: '' },
];

export default function Prediction() {
  const [form,    setForm]    = useState(() => Object.fromEntries(FIELDS.map(f => [f.key, f.default])));
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Cast number fields
      const payload = { ...form };
      FIELDS.forEach(f => { if (f.type === 'number') payload[f.key] = Number(payload[f.key]); });
      const { data } = await API.post('/predict', payload);
      setResult(data);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Prediction failed');
    } finally { setLoading(false); }
  };

  const resultColors = result ? (result.is_fraud
    ? { ring: '#ef4444', bg: 'bg-red-500/10 border-red-500/30', text: 'text-red-400' }
    : { ring: '#22c55e', bg: 'bg-green-500/10 border-green-500/30', text: 'text-green-400' }) : null;

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      <PageHeader title="Single Transaction Predict"
        subtitle="Manually enter transaction fields to get instant fraud prediction" />

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Form */}
        <form onSubmit={handleSubmit} className="glass-card p-6 lg:col-span-3 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <CpuChipIcon className="w-4 h-4 text-brand-400" />
            <span className="text-sm font-semibold text-slate-300">Transaction Fields</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {FIELDS.map(({ key, label, type, hint }) => (
              <div key={key}>
                <label className="text-xs text-slate-400 font-medium">{label}
                  {hint && <span className="text-slate-600 ml-1">({hint})</span>}
                </label>
                <input type={type} className="input-field mt-1 text-sm"
                  value={form[key]} onChange={set(key)} />
              </div>
            ))}
          </div>

          <div className="bg-dark-700/50 rounded-xl p-3 flex items-start gap-2 mt-2">
            <InformationCircleIcon className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400">
              Unfilled V1–V339 and other features will default to <code>-999</code> (missing).
              For a realistic prediction upload a full CSV row.
            </p>
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2">
            {loading ? <><Spinner size="sm" /> Predicting…</> : <>⚡ Predict Fraud</>}
          </button>
        </form>

        {/* Result card */}
        <div className="lg:col-span-2">
          {result ? (
            <div className={`glass-card border p-6 animate-slide-up ${resultColors.bg}`}>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-slate-300">Prediction Result</h3>
                <FraudBadge isFraud={result.is_fraud} />
              </div>

              {/* Risk ring */}
              <div className="flex justify-center mb-6">
                <RiskRing score={result.risk_score} size={120} />
              </div>

              <div className="space-y-3">
                {[
                  { label: 'Transaction ID', val: result.transaction_id },
                  { label: 'Prediction',     val: result.prediction,   bold: true },
                  { label: 'Fraud Probability', val: fmt.pct(result.fraud_prob) },
                  { label: 'Confidence',     val: fmt.pct(result.confidence) },
                  { label: 'Risk Score',     val: fmt.score(result.risk_score) },
                  { label: 'Risk Level',     el: <RiskBadge score={result.risk_score} level={result.risk_level} /> },
                ].map(({ label, val, el, bold }) => (
                  <div key={label} className="flex items-center justify-between text-sm">
                    <span className="text-slate-400">{label}</span>
                    {el || <span className={`${bold ? resultColors.text+' font-semibold' : 'text-slate-200'} font-mono text-xs`}>{val}</span>}
                  </div>
                ))}
              </div>

              <div className={`mt-4 p-3 rounded-xl border ${resultColors.bg} text-xs ${resultColors.text} font-medium`}>
                💡 {result.recommendation}
              </div>
            </div>
          ) : (
            <div className="glass-card p-6 h-full flex flex-col items-center justify-center gap-4 text-center min-h-64">
              <div className="w-14 h-14 bg-dark-700 rounded-2xl flex items-center justify-center">
                <CpuChipIcon className="w-7 h-7 text-slate-500" />
              </div>
              <div>
                <p className="text-slate-300 font-medium">No prediction yet</p>
                <p className="text-slate-500 text-xs mt-1">Fill in the form and click Predict</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
