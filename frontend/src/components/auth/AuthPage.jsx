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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-2">
            <Factory className="w-10 h-10 text-blue-400" />
            <h1 className="text-3xl font-bold text-white">FactoryServSim</h1>
          </div>
          <p className="text-slate-400 text-sm">
            Factory Machine-Adjuster Utilization Simulator
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-700 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6 text-center">
            {isRegister ? 'Register New Factory Account' : 'Factory Login'}
          </h2>

          {/* Server wake-up status */}
          {!serverReady && (
            <div className="mb-4 p-3 bg-amber-900/50 border border-amber-700 rounded-lg text-amber-300 text-sm flex items-center gap-2">
              <Loader className="w-4 h-4 flex-shrink-0 animate-spin" />
              Waking up server... You can start filling in your details.
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 bg-emerald-900/50 border border-emerald-700 rounded-lg text-emerald-300 text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              {successMsg}
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-900/50 border border-red-700 rounded-lg text-red-300 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Factory ID — always shown */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Factory ID
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  value={factoryId}
                  onChange={(e) => setFactoryId(e.target.value.toUpperCase())}
                  placeholder="e.g. FAC001"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Registration-only fields */}
            {isRegister && (
              <>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Factory Name
                  </label>
                  <div className="relative">
                    <Factory className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={factoryName}
                      onChange={(e) => setFactoryName(e.target.value)}
                      placeholder="e.g. Pune Manufacturing Plant"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Manager Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={managerName}
                      onChange={(e) => setManagerName(e.target.value)}
                      placeholder="e.g. Rajesh Kumar"
                      required
                      className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Manager Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="manager@factory.com"
                  required
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  required
                  minLength={6}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors"
            >
              {loading ? (
                <span className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : isRegister ? (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Factory Account
                </>
              ) : (
                <>
                  <LogIn className="w-4 h-4" />
                  Sign In
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <button
              onClick={switchMode}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              {isRegister
                ? 'Already have an account? Sign in'
                : "Don't have an account? Register your factory"}
            </button>
          </div>
        </div>

        {/* Info note */}
        <p className="text-center text-xs text-slate-600 mt-4">
          Data is stored per Factory ID. When a manager changes, factory data persists.
        </p>
      </div>
    </div>
  );
}
