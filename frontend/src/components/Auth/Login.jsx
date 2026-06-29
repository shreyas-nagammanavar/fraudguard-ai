import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheckIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { Spinner } from '../UI';

export default function Login() {
  const { login, register } = useAuth();
  const navigate  = useNavigate();
  const [tab,       setTab]       = useState('login');    // login | register
  const [loading,   setLoading]   = useState(false);
  const [showPwd,   setShowPwd]   = useState(false);
  const [remember,  setRemember]  = useState(false);
  const [form, setForm] = useState({ username: '', email: '', password: '' });

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return toast.error('Fill all fields');
    setLoading(true);
    try {
      const user = await login(form.email, form.password, remember);
      console.log('Login returned user:', user);
      toast.success('Welcome back!');
      // Small delay to ensure state updates
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
    } catch (err) {
      console.error('Login error:', err);
      toast.error(err.response?.data?.error || 'Login failed');
    } finally { setLoading(false); }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const { username, email, password } = form;
    if (!username || !email || !password) return toast.error('Fill all fields');
    if (password.length < 6) return toast.error('Password must be ≥ 6 characters');
    setLoading(true);
    try {
      const user = await register(username, email, password);
      console.log('Register returned user:', user);
      toast.success('Account created! Redirecting...');
      // Small delay to ensure state updates
      setTimeout(() => {
        navigate('/dashboard');
      }, 100);
    } catch (err) {
      console.error('Register error:', err);
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel – brand */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-dark-900 via-dark-800 to-dark-900 flex-col items-center justify-center p-16 relative overflow-hidden">
        {/* Background blobs */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-brand-600/20 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-purple-600/15 rounded-full blur-3xl" />

        <div className="relative z-10 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-brand-500 to-purple-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-brand-500/40">
            <ShieldCheckIcon className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-5xl font-extrabold gradient-text mb-4">FraudGuard AI</h1>
          <p className="text-lg text-slate-400 leading-relaxed max-w-sm">
            Enterprise-grade credit card fraud detection powered by advanced machine learning.
          </p>

          <div className="grid grid-cols-2 gap-4 mt-12">
            {[
              { label: 'Accuracy', val: '99.2%' },
              { label: 'ROC-AUC',  val: '0.98'  },
              { label: 'Precision', val: '97.8%' },
              { label: 'Recall',    val: '96.1%' },
            ].map(({ label, val }) => (
              <div key={label} className="glass-card p-4 text-center">
                <p className="text-2xl font-bold text-white">{val}</p>
                <p className="text-xs text-slate-400 mt-1">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel – form */}
      <div className="flex-1 flex items-center justify-center p-8 bg-dark-900">
        <div className="w-full max-w-md animate-slide-up">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-gradient-to-br from-brand-500 to-purple-600 rounded-xl flex items-center justify-center">
              <ShieldCheckIcon className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">FraudGuard AI</span>
          </div>

          {/* Tab switcher */}
          <div className="flex bg-dark-800 p-1 rounded-xl mb-8 border border-white/5">
            {['login','register'].map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 capitalize
                  ${tab === t ? 'bg-brand-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                {t === 'login' ? 'Sign In' : 'Register'}
              </button>
            ))}
          </div>

          <div className="glass-card p-8">
            {tab === 'login' ? (
              <>
                <h2 className="text-2xl font-bold text-white mb-2">Welcome back</h2>
                <p className="text-slate-400 text-sm mb-6">Sign in to your account</p>
                <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Email</label>
                    <input type="email" className="input-field mt-1.5" placeholder="admin@fraudguard.ai"
                      value={form.email} onChange={set('email')} autoFocus />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Password</label>
                    <div className="relative mt-1.5">
                      <input type={showPwd ? 'text' : 'password'} className="input-field pr-10"
                        placeholder="••••••••" value={form.password} onChange={set('password')} />
                      <button type="button" onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300">
                        {showPwd ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)}
                        className="w-4 h-4 accent-brand-500 rounded" />
                      <span className="text-sm text-slate-400">Remember me</span>
                    </label>
                    <button type="button" className="text-sm text-brand-400 hover:text-brand-300">Forgot password?</button>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                    {loading ? <Spinner size="sm" /> : null}
                    {loading ? 'Signing in…' : 'Sign In'}
                  </button>
                </form>
              </>
            ) : (
              <>
                <h2 className="text-2xl font-bold text-white mb-2">Create account</h2>
                <p className="text-slate-400 text-sm mb-6">Get started for free</p>
                <form onSubmit={handleRegister} className="space-y-4">
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Username</label>
                    <input className="input-field mt-1.5" placeholder="johndoe" value={form.username} onChange={set('username')} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Email</label>
                    <input type="email" className="input-field mt-1.5" placeholder="john@example.com" value={form.email} onChange={set('email')} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Password</label>
                    <div className="relative mt-1.5">
                      <input type={showPwd ? 'text' : 'password'} className="input-field pr-10"
                        placeholder="••••••••" value={form.password} onChange={set('password')} />
                      <button type="button" onClick={() => setShowPwd(!showPwd)}
                        className="absolute right-3 top-3.5 text-slate-500 hover:text-slate-300">
                        {showPwd ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <button type="submit" disabled={loading} className="btn-primary w-full flex items-center justify-center gap-2 mt-2">
                    {loading ? <Spinner size="sm" /> : null}
                    {loading ? 'Creating account…' : 'Create Account'}
                  </button>
                </form>
              </>
            )}
          </div>

          <p className="text-center text-xs text-slate-500 mt-6">
            Demo credentials: <code className="text-brand-400">admin@fraudguard.ai</code> / <code className="text-brand-400">admin123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
