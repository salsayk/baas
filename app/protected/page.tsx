"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/app/components/sidebar";
import { NotificationContainer, useNotifications } from "@/app/components/notifications";

interface KeyInfo {
  id: string;
  name: string;
  type: string;
}

export default function ProtectedPage() {
  const [mounted, setMounted] = useState(false);
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const router = useRouter();
  
  const { 
    notifications, 
    dismissNotification, 
    notifyError,
    showNotification 
  } = useNotifications();

  const validateApiKey = useCallback(async () => {
    const pendingKey = sessionStorage.getItem("pendingApiKey");
    
    if (!pendingKey) {
      notifyError("No API key provided. Please enter an API key first.");
      setTimeout(() => router.push("/playground"), 2000);
      return;
    }

    try {
      const response = await fetch("/api/keys/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ apiKey: pendingKey }),
      });

      const data = await response.json();

      if (data.valid) {
        setIsValid(true);
        setKeyInfo(data.keyInfo);
        showNotification("Valid API key, /protected can be accessed", "create");
      } else {
        setIsValid(false);
        notifyError(data.error || "Invalid API key");
      }
    } catch (error) {
      console.error("Validation error:", error);
      notifyError("Failed to validate API key");
    } finally {
      setIsValidating(false);
      // Clear the pending key after validation
      sessionStorage.removeItem("pendingApiKey");
    }
  }, [router, notifyError, showNotification]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      validateApiKey();
    }
  }, [mounted, validateApiKey]);

  if (!mounted || isValidating) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Validating API key...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />

      <main className="flex-1 flex flex-col">
        {/* Top Bar */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Pages</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-700 font-medium">Protected</span>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
            isValid 
              ? "bg-emerald-50 border border-emerald-200" 
              : "bg-red-50 border border-red-200"
          }`}>
            <span className={`w-2 h-2 rounded-full ${
              isValid ? "bg-emerald-500" : "bg-red-500"
            }`} />
            <span className={`text-sm font-medium ${
              isValid ? "text-emerald-700" : "text-red-700"
            }`}>
              {isValid ? "Authenticated" : "Unauthorized"}
            </span>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-8 overflow-auto">
          <div className="max-w-2xl mx-auto">
            {isValid ? (
              <>
                {/* Success State */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-green-500 mb-6 shadow-lg shadow-emerald-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
                      <polyline points="22 4 12 14.01 9 11.01"/>
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">Access Granted</h1>
                  <p className="text-slate-500">Your API key has been validated successfully.</p>
                </div>

                {/* Key Info Card */}
                {keyInfo && (
                  <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">API Key Details</h2>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Key Name</span>
                        <span className="text-sm font-medium text-slate-900">{keyInfo.name}</span>
                      </div>
                      <div className="flex items-center justify-between py-2 border-b border-slate-100">
                        <span className="text-sm text-slate-500">Key Type</span>
                        <span className={`px-2.5 py-1 rounded-md text-xs font-medium ${
                          keyInfo.type === "prod"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {keyInfo.type}
                        </span>
                      </div>
                      <div className="flex items-center justify-between py-2">
                        <span className="text-sm text-slate-500">Status</span>
                        <span className="flex items-center gap-1.5 text-sm font-medium text-emerald-600">
                          <span className="w-2 h-2 rounded-full bg-emerald-500" />
                          Active
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Protected Content */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-8 text-white">
                  <div className="flex items-center gap-3 mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                    <h3 className="text-lg font-semibold">Protected Content</h3>
                  </div>
                  <p className="text-slate-300 mb-4">
                    You now have access to protected resources. This content is only visible to authenticated users with a valid API key.
                  </p>
                  <div className="bg-slate-950/50 rounded-xl p-4 font-mono text-sm text-emerald-400">
                    <code>$ curl -H &quot;Authorization: Bearer YOUR_API_KEY&quot; https://api.example.com/protected</code>
                  </div>
                </div>

                {/* Back Button */}
                <div className="mt-6 text-center">
                  <button
                    onClick={() => router.push("/playground")}
                    className="text-sm text-slate-500 hover:text-slate-700 underline underline-offset-2"
                  >
                    ← Back to API Playground
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Error State */}
                <div className="text-center mb-8">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-red-400 to-rose-500 mb-6 shadow-lg shadow-red-500/30">
                    <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/>
                      <line x1="15" y1="9" x2="9" y2="15"/>
                      <line x1="9" y1="9" x2="15" y2="15"/>
                    </svg>
                  </div>
                  <h1 className="text-3xl font-bold text-slate-900 mb-2">Access Denied</h1>
                  <p className="text-slate-500">The API key you provided is invalid or has expired.</p>
                </div>

                {/* Error Card */}
                <div className="bg-white rounded-2xl border border-red-200 p-6 mb-6">
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl bg-red-50">
                      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500">
                        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/>
                        <line x1="12" y1="9" x2="12" y2="13"/>
                        <line x1="12" y1="17" x2="12.01" y2="17"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-slate-900 mb-1">Invalid API Key</h3>
                      <p className="text-sm text-slate-500 mb-4">
                        Please check your API key and try again. Make sure you&apos;re using a valid key from your dashboard.
                      </p>
                      <button
                        onClick={() => router.push("/playground")}
                        className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                      >
                        Try Again
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </main>

      {/* Notifications */}
      <NotificationContainer notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}

