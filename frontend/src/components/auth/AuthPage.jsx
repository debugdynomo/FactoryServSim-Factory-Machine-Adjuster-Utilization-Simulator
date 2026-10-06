import React, { useState, useEffect } from 'react';
import { LogIn, UserPlus, Factory, Mail, Lock, User, Hash, CheckCircle, Loader } from 'lucide-react';
import { isServerWarmedUp } from '../../api/authApi';

/**
 * AuthPage — Login & Register page for FactoryServSim.
 * Registration: factory_name, factory_id, manager_name, email, password
 * Login: factory_id, email, password
 * After registration, redirects to login page (no auto-login).
 */
export default function AuthPage({ onLoginSuccess }) {
  const [isRegister, setIsRegister] = useState(false);
  const [factoryId, setFactoryId] = useState('');
  const [factoryName, setFactoryName] = useState('');
  const [managerName, setManagerName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [serverReady, setServerReady] = useState(isServerWarmedUp());

  // Poll server readiness while still waking up
  useEffect(() => {
    if (serverReady) return;
    const interval = setInterval(() => {
      if (isServerWarmedUp()) {
        setServerReady(true);
        clearInterval(interval);
      }
    }, 500);
    return () => clearInterval(interval);
  }, [serverReady]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');
    setLoading(true);

    try {
      if (isRegister) {
        const { registerUser } = await import('../../api/authApi');
        await registerUser(factoryId, factoryName, managerName, email, password);
        // Registration successful — switch to login page
        setSuccessMsg('Account created successfully! Please login with your credentials.');
        setIsRegister(false);
        setPassword('');
        // Keep factoryId and email so user can just type password
      } else {
        const { loginUser } = await import('../../api/authApi');
        await loginUser(factoryId, email, password);
        onLoginSuccess();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setIsRegister(!isRegister);
    setError('');
    setSuccessMsg('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center gap-3 mb-2">
            <div className="bg-white p-3 border border-slate-200 shadow-sm rounded-xl">
              <Factory className="w-8 h-8 text-slate-700" />
            </div>
          </div>
          <h1 className="text-2xl font-semibold text-slate-900 tracking-tight mt-4">FactoryServSim</h1>
          <p className="text-slate-500 text-sm mt-1">
            Sign in to manage your factory configuration
          </p>
        </div>

        {/* Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">
            {isRegister ? 'Register Account' : 'Welcome back'}
          </h2>

          {/* Server wake-up status */}
          {!serverReady && (
            <div className="mb-6 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-800 text-sm flex items-center gap-2">
              <Loader className="w-4 h-4 flex-shrink-0 animate-spin text-amber-600" />
              Waking up server... you can start typing.
            </div>
          )}

          {successMsg && (
            <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-emerald-800 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0 text-emerald-600" />
              {successMsg}
            </div>
          )}

          {error && (
            <div className="mb-6 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Factory ID */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Factory ID
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={factoryId}
                  onChange={(e) => setFactoryId(e.target.value.toUpperCase())}
                  placeholder="e.g. FAC001"
                  required
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Registration-only fields */}
            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Factory Name
                  </label>
                  <div className="relative">
                    <Factory className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={factoryName}
                      onChange={(e) => setFactoryName(e.target.value)}
                      placeholder="e.g. Pune Manufacturing Plant"
                      required
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Manager Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      required
                      className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@factory.com"
                  required
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  minLength={6}
                  className="w-full pl-9 pr-4 py-2 bg-white border border-slate-300 rounded-md text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 flex items-center justify-center gap-2 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed text-white font-medium rounded-md shadow-sm transition-colors"
            >
              {loading ? (
                <span className="animate-spin w-4 h-4 border-2 border-white/20 border-t-white rounded-full" />
              ) : isRegister ? (
                'Create Account'
              ) : (
                'Sign In'
              )}
            </button>
          </form>
        </div>

        <div className="mt-6 text-center">
          <button
            onClick={switchMode}
            className="text-sm text-slate-500 hover:text-slate-800 transition-colors"
          >
            {isRegister
              ? 'Already have an account? Sign in'
              : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
}
