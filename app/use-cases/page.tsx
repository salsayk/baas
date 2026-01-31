"use client";

import { useState, useEffect } from "react";
import { Sidebar, SidebarProvider, MobileMenuButton } from "@/app/components/sidebar";

interface RepositoryInfo {
  name: string;
  fullName: string;
  description: string | null;
  url: string;
  stars: number;
  forks: number;
  language: string | null;
  topics: string[];
  createdAt: string;
  updatedAt: string;
}

interface AnalysisResult {
  purpose: string;
  features: string[];
  techStack: string[];
  targetAudience: string;
  summary: string;
}

interface SummaryResult {
  repository: RepositoryInfo;
  analysis: AnalysisResult;
  status: string;
}

function UseCasesContent() {
  const [mounted, setMounted] = useState(false);
  const [apiKey, setApiKey] = useState("");
  const [githubUrl, setGithubUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim() || !githubUrl.trim()) return;

    setIsLoading(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch("/api/github-summarizer", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey.trim(),
        },
        body: JSON.stringify({ githubUrl: githubUrl.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "An error occurred");
      } else {
        setResult(data);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to connect to API");
    } finally {
      setIsLoading(false);
    }
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
              <span className="text-slate-700 font-medium">Use Cases</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-sm font-medium text-emerald-700">Operational</span>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-2">Use Cases</h1>
            <p className="text-slate-500 mb-6 lg:mb-8">
              Explore and test our AI-powered APIs with real-world use cases.
            </p>

            {/* GitHub Summarizer Form */}
            <div className="bg-white rounded-xl lg:rounded-2xl border border-slate-200 p-4 lg:p-8 mb-6 lg:mb-8">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 lg:p-3 rounded-lg lg:rounded-xl bg-gradient-to-br from-purple-500 to-pink-600">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="white" className="lg:w-6 lg:h-6">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                  </svg>
                </div>
                <div>
                  <h2 className="text-lg lg:text-xl font-semibold text-slate-900">GitHub Repository Summarizer</h2>
                  <p className="text-sm text-slate-500">Get an AI-powered summary of any public GitHub repository</p>
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
                    placeholder="Enter your API key"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                    autoComplete="off"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Your API key from the dashboard
                  </p>
                </div>

                <div>
                  <label htmlFor="githubUrl" className="block text-sm font-medium text-slate-700 mb-2">
                    GitHub Repository URL
                  </label>
                  <input
                    id="githubUrl"
                    type="url"
                    value={githubUrl}
                    onChange={(e) => setGithubUrl(e.target.value)}
                    placeholder="https://github.com/owner/repository"
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all"
                  />
                  <p className="mt-2 text-xs text-slate-500">
                    Enter a public GitHub repository URL
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={!apiKey.trim() || !githubUrl.trim() || isLoading}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-600 text-white font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:from-purple-600 hover:to-pink-700 transition-all shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
                >
                  {isLoading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Analyzing Repository...
                    </>
                  ) : (
                    <>
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                      </svg>
                      Generate Summary
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl lg:rounded-2xl p-4 lg:p-6 mb-6 lg:mb-8">
                <div className="flex items-start gap-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 mt-0.5 flex-shrink-0">
                    <circle cx="12" cy="12" r="10"/>
                    <line x1="12" x2="12" y1="8" y2="12"/>
                    <line x1="12" x2="12.01" y1="16" y2="16"/>
                  </svg>
                  <div>
                    <h3 className="font-semibold text-red-800">Error</h3>
                    <p className="text-sm text-red-600 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Results Display */}
            {result && (
              <div className="space-y-4 lg:space-y-6">
                {/* Repository Info */}
                <div className="bg-white rounded-xl lg:rounded-2xl border border-slate-200 p-4 lg:p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                      <path d="M9 18c-4.51 2-5-2-7-2"/>
                    </svg>
                    Repository Information
                  </h3>
                  
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4 mb-4">
                    <a 
                      href={result.repository.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="col-span-2 lg:col-span-4 text-base lg:text-lg font-medium text-purple-600 hover:text-purple-700 flex items-center gap-2 truncate"
                    >
                      <span className="truncate">{result.repository.fullName}</span>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
                        <polyline points="15 3 21 3 21 9"/>
                        <line x1="10" x2="21" y1="14" y2="3"/>
                      </svg>
                    </a>
                    
                    <div className="bg-slate-50 rounded-lg lg:rounded-xl p-2.5 lg:p-3">
                      <p className="text-xs text-slate-500 mb-1">Stars</p>
                      <p className="font-semibold text-slate-900 flex items-center gap-1 text-sm lg:text-base">
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-amber-400">
                          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                        </svg>
                        {result.repository.stars.toLocaleString()}
                      </p>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg lg:rounded-xl p-2.5 lg:p-3">
                      <p className="text-xs text-slate-500 mb-1">Forks</p>
                      <p className="font-semibold text-slate-900 text-sm lg:text-base">{result.repository.forks.toLocaleString()}</p>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg lg:rounded-xl p-2.5 lg:p-3">
                      <p className="text-xs text-slate-500 mb-1">Language</p>
                      <p className="font-semibold text-slate-900 text-sm lg:text-base truncate">{result.repository.language || "N/A"}</p>
                    </div>
                    
                    <div className="bg-slate-50 rounded-lg lg:rounded-xl p-2.5 lg:p-3">
                      <p className="text-xs text-slate-500 mb-1">Updated</p>
                      <p className="font-semibold text-slate-900 text-xs lg:text-sm">
                        {new Date(result.repository.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {result.repository.description && (
                    <p className="text-sm text-slate-600 mb-4">{result.repository.description}</p>
                  )}

                  {result.repository.topics.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {result.repository.topics.map((topic) => (
                        <span 
                          key={topic} 
                          className="px-2 lg:px-2.5 py-1 text-xs font-medium bg-purple-50 text-purple-700 rounded-full"
                        >
                          {topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* AI Analysis */}
                <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl lg:rounded-2xl border border-purple-100 p-4 lg:p-6">
                  <h3 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500">
                      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                    </svg>
                    AI-Generated Analysis
                  </h3>
                  
                  {/* Purpose */}
                  <div className="mb-4 lg:mb-6">
                    <h4 className="text-sm font-semibold text-purple-800 mb-2">Purpose</h4>
                    <p className="text-slate-700 text-sm leading-relaxed">{result.analysis.purpose}</p>
                  </div>

                  {/* Key Features */}
                  <div className="mb-4 lg:mb-6">
                    <h4 className="text-sm font-semibold text-purple-800 mb-2">Key Features</h4>
                    <ul className="space-y-2">
                      {result.analysis.features.map((feature, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm text-slate-700">
                          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-purple-500 mt-0.5 flex-shrink-0">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Tech Stack */}
                  <div className="mb-4 lg:mb-6">
                    <h4 className="text-sm font-semibold text-purple-800 mb-2">Technology Stack</h4>
                    <div className="flex flex-wrap gap-2">
                      {result.analysis.techStack.map((tech, index) => (
                        <span 
                          key={index} 
                          className="px-2.5 lg:px-3 py-1 lg:py-1.5 text-xs font-medium bg-white text-purple-700 rounded-full border border-purple-200"
                        >
                          {tech}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Target Audience */}
                  <div className="mb-4 lg:mb-6">
                    <h4 className="text-sm font-semibold text-purple-800 mb-2">Target Audience</h4>
                    <p className="text-slate-700 text-sm leading-relaxed">{result.analysis.targetAudience}</p>
                  </div>

                  {/* Summary */}
                  <div className="pt-4 border-t border-purple-200">
                    <h4 className="text-sm font-semibold text-purple-800 mb-2">Summary</h4>
                    <p className="text-slate-700 text-sm whitespace-pre-wrap leading-relaxed">{result.analysis.summary}</p>
                  </div>
                </div>
              </div>
            )}

            {/* How It Works */}
            <div className="bg-white rounded-xl lg:rounded-2xl border border-slate-200 p-4 lg:p-6 mt-6 lg:mt-8">
              <h3 className="text-lg font-semibold text-slate-900 mb-4">How It Works</h3>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm flex-shrink-0">1</div>
                  <div>
                    <p className="font-medium text-slate-900">Authenticate</p>
                    <p className="text-sm text-slate-500">Enter your valid API key</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm flex-shrink-0">2</div>
                  <div>
                    <p className="font-medium text-slate-900">Provide URL</p>
                    <p className="text-sm text-slate-500">Enter a GitHub repo URL</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 font-bold text-sm flex-shrink-0">3</div>
                  <div>
                    <p className="font-medium text-slate-900">Get Summary</p>
                    <p className="text-sm text-slate-500">AI analyzes and summarizes</p>
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

export default function UseCasesPage() {
  return (
    <SidebarProvider>
      <UseCasesContent />
    </SidebarProvider>
  );
}
