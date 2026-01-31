"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar, SidebarProvider, MobileMenuButton } from "@/app/components/sidebar";

function PlaygroundContent() {
  const [mounted, setMounted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) return;

    setIsLoading(true);
    
    // Store the API key in sessionStorage for the protected page to validate
    sessionStorage.setItem("pendingApiKey", apiKey.trim());
    
    // Navigate to protected page for validation
    router.push("/protected");
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="h-14 lg:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <MobileMenuButton />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 hidden sm:inline">Pages</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="text-slate-700 font-medium">API Playground</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-emerald-700">Operational</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <div className="max-w-2xl mx-auto">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">API Playground</h1>
            <p className="text-slate-500 mb-6 lg:mb-8">
              Test your API key to verify it&apos;s working correctly.
            </p>

            {/* API Key Test Form */}
            <div className="bg-white rounded-xl lg:rounded-2xl border border-slate-200 p-4 lg:p-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 lg:p-3 rounded-lg lg:rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lg:w-6 lg:h-6">
                    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg lg:text-xl font-semibold text-slate-900">Validate API Key</h2>
                  <p className="text-sm text-slate-500">Enter your API key to test if it&apos;s valid</p>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-6">
                <div>
                  <label htmlFor="apiKey" className="block text-sm font-medium text-slate-700 mb-2">
                    API Key
                  </label>
                  <input
                    id="apiKey"
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="dk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    autoComplete="off"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Your API key starts with <code className="bg-slate-100 px-1.5 py-0.5 rounded">dk_</code> or <code className="bg-slate-100 px-1.5 py-0.5 rounded">dk_dev_</code>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!apiKey.trim() || isLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Validating...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                        <polyline points="22 4 12 14.01 9 11.01"/>
                      </svg>
                      Validate API Key
                    </>
                  )}
                </button>
              </form>

              {/* Info Box */}
              <div className="mt-6 lg:mt-8 p-3 lg:p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400 mt-0.5 flex-shrink-0">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M12 16v-4"/>
                    <path d="M12 8h.01"/>
                  </svg>
                  <div>
                    <p className="text-sm text-slate-600">
                      Your API key will be validated against our database. If valid, you&apos;ll be granted access to protected resources.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function PlaygroundPage() {
  return (
    <SidebarProvider>
      <PlaygroundContent />
    </SidebarProvider>
  );
}
