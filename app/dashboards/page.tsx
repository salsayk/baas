"use client";

import { useState, useEffect, useCallback } from "react";
import { NotificationContainer, useNotifications } from "@/app/components/notifications";
import { Sidebar, SidebarProvider, MobileMenuButton } from "@/app/components/sidebar";

interface ApiKey {
  id: string;
  name: string;
  key: string;
  type: "dev" | "prod";
  usage: number;
  limit: number;
  created_at: string;
}

function generateApiKey(type: "dev" | "prod"): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const prefix = type === "dev" ? "dk_dev_" : "dk_";
  let result = prefix;
  for (let i = 0; i < 28; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function maskApiKey(key: string): string {
  const prefix = key.split("_").slice(0, -1).join("_") + "_";
  return prefix + "*".repeat(28);
}

// Usage progress bar component
function UsageProgress({ usage, limit }: { usage: number; limit: number }) {
  const percentage = limit > 0 ? Math.min((usage / limit) * 100, 100) : 0;
  const isNearLimit = percentage >= 80;
  const isAtLimit = percentage >= 100;
  
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-[60px]">
        <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div 
            className={`h-full rounded-full transition-all ${
              isAtLimit ? 'bg-red-500' : isNearLimit ? 'bg-amber-500' : 'bg-blue-500'
            }`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
      <span className={`text-xs font-medium whitespace-nowrap ${
        isAtLimit ? 'text-red-600' : isNearLimit ? 'text-amber-600' : 'text-slate-600'
      }`}>
        {usage.toLocaleString()} / {limit.toLocaleString()}
      </span>
    </div>
  );
}

// Mobile API Key Card Component
function ApiKeyCard({
  apiKey,
  isRevealed,
  isCopied,
  isDeleting,
  onToggleReveal,
  onCopy,
  onEdit,
  onDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  apiKey: ApiKey;
  isRevealed: boolean;
  isCopied: boolean;
  isDeleting: boolean;
  onToggleReveal: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-medium text-slate-900">{apiKey.name}</span>
        <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
          apiKey.type === "prod"
            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
            : "bg-slate-100 text-slate-600 border border-slate-200"
        }`}>
          {apiKey.type}
        </span>
      </div>

      {/* Key */}
      <div className="flex items-center gap-2">
        <code className="flex-1 text-xs font-mono text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-md truncate">
          {isRevealed ? apiKey.key : maskApiKey(apiKey.key)}
        </code>
      </div>

      {/* Usage */}
      <div className="space-y-1">
        <div className="text-xs text-slate-500">Usage</div>
        <UsageProgress usage={apiKey.usage} limit={apiKey.limit} />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
        <button
          onClick={onToggleReveal}
          className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
        >
          {isRevealed ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                <line x1="1" y1="1" x2="23" y2="23"/>
              </svg>
              Hide
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              Show
            </>
          )}
        </button>
        <button
          onClick={onCopy}
          className="flex-1 py-2 px-3 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors flex items-center justify-center gap-2"
        >
          {isCopied ? (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Copied
            </>
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              Copy
            </>
          )}
        </button>
        <button
          onClick={onEdit}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
        </button>
        {isDeleting ? (
          <div className="flex items-center gap-1">
            <button
              onClick={onConfirmDelete}
              className="px-2 py-1.5 rounded text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
            >
              Confirm
            </button>
            <button
              onClick={onCancelDelete}
              className="px-2 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={onDelete}
            className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              <line x1="10" y1="11" x2="10" y2="17"/>
              <line x1="14" y1="11" x2="14" y2="17"/>
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function DashboardContent() {
  const [mounted, setMounted] = useState(false);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<ApiKey | null>(null);
  const [newKeyName, setNewKeyName] = useState("");
  const [newKeyType, setNewKeyType] = useState<"dev" | "prod">("dev");
  const [newKeyLimit, setNewKeyLimit] = useState(1000);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { 
    notifications, 
    dismissNotification, 
    notifyCreate, 
    notifyUpdate, 
    notifyDelete, 
    notifyError,
    notifyCopy 
  } = useNotifications();

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchApiKeys = useCallback(async () => {
    try {
      setError(null);
      const response = await fetch('/api/keys');
      
      if (!response.ok) {
        try {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to fetch API keys');
        } catch {
          throw new Error(`Failed to fetch API keys (${response.status})`);
        }
      }
      
      const data = await response.json();
      setApiKeys(Array.isArray(data) ? data : []);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred';
      setError(message);
      console.error('Error fetching API keys:', err);
      setApiKeys([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApiKeys();
  }, [fetchApiKeys]);

  const handleCreateKey = async () => {
    if (!newKeyName.trim()) return;

    setIsSaving(true);
    try {
      const newKey = {
        name: newKeyName.trim(),
        key: generateApiKey(newKeyType),
        type: newKeyType,
        limit: newKeyLimit,
      };

      const response = await fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newKey),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create API key');
      }

      const createdKey = await response.json();
      setApiKeys([createdKey, ...apiKeys]);
      setRevealedKeys(new Set([...revealedKeys, createdKey.id]));
      resetModalState();
      notifyCreate(`API key "${createdKey.name}" created successfully`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to create API key';
      notifyError(message);
      console.error('Error creating API key:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateKey = async () => {
    if (!editingKey || !newKeyName.trim()) return;

    setIsSaving(true);
    try {
      const response = await fetch(`/api/keys/${editingKey.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newKeyName.trim(),
          type: newKeyType,
          limit: newKeyLimit,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update API key');
      }

      const updatedKey = await response.json();
      setApiKeys(apiKeys.map((key) => (key.id === editingKey.id ? updatedKey : key)));
      resetModalState();
      notifyUpdate(`API key "${updatedKey.name}" updated successfully`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update API key';
      notifyError(message);
      console.error('Error updating API key:', err);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    const keyToDelete = apiKeys.find((key) => key.id === id);
    try {
      const response = await fetch(`/api/keys/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete API key');
      }

      setApiKeys(apiKeys.filter((key) => key.id !== id));
      setDeleteConfirm(null);
      notifyDelete(`API key "${keyToDelete?.name || 'Unknown'}" deleted`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete API key';
      notifyError(message);
      console.error('Error deleting API key:', err);
    }
  };

  const handleCopyKey = async (key: ApiKey) => {
    await navigator.clipboard.writeText(key.key);
    setCopiedId(key.id);
    notifyCopy("API key copied to clipboard");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const toggleRevealKey = (id: string) => {
    const newRevealed = new Set(revealedKeys);
    if (newRevealed.has(id)) {
      newRevealed.delete(id);
    } else {
      newRevealed.add(id);
    }
    setRevealedKeys(newRevealed);
  };

  const resetModalState = () => {
    setIsModalOpen(false);
    setEditingKey(null);
    setNewKeyName("");
    setNewKeyType("dev");
    setNewKeyLimit(1000);
  };

  const openEditModal = (key: ApiKey) => {
    setEditingKey(key);
    setNewKeyName(key.name);
    setNewKeyType(key.type);
    setNewKeyLimit(key.limit);
    setIsModalOpen(true);
  };

  const openCreateModal = () => {
    setEditingKey(null);
    setNewKeyName("");
    setNewKeyType("dev");
    setNewKeyLimit(1000);
    setIsModalOpen(true);
  };

  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-3 border-slate-200 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-slate-500 text-sm">Loading dashboard...</p>
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
              <span className="text-slate-700 font-medium">Overview</span>
            </div>
          </div>
          <div className="flex items-center gap-2 lg:gap-4">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-sm font-medium text-emerald-700">Operational</span>
            </div>
            <div className="flex items-center gap-1 lg:gap-2">
              <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors hidden sm:block">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/>
                  <path d="M9 18c-4.51 2-5-2-7-2"/>
                </svg>
              </button>
              <button className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-6 lg:mb-8">Overview</h1>

          {/* Error Alert */}
          {error && (
            <div className="mb-4 lg:mb-6 p-3 lg:p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-500 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-sm text-red-700 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700 flex-shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}

          {/* Promo Banner */}
          <div className="mb-4 lg:mb-6 p-3 lg:p-4 rounded-xl lg:rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-rose-50 border border-amber-200/50">
            <p className="text-center text-sm">
              <a href="#" className="font-semibold text-amber-700 hover:text-amber-800 underline underline-offset-2">
                Get Certified!
              </a>
              <span className="text-slate-600"> Share Your Badge & Earn Free Credits</span>
            </p>
          </div>

          {/* Plan Card */}
          <div className="mb-6 lg:mb-8 p-4 lg:p-6 rounded-xl lg:rounded-2xl bg-gradient-to-br from-violet-500 via-purple-500 to-fuchsia-400 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 lg:w-64 h-32 lg:h-64 bg-gradient-to-br from-white/10 to-transparent rounded-full -translate-y-16 lg:-translate-y-32 translate-x-16 lg:translate-x-32" />
            <div className="absolute bottom-0 left-0 w-24 lg:w-48 h-24 lg:h-48 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-12 lg:translate-y-24 -translate-x-12 lg:-translate-x-24" />
            
            <div className="relative">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-2">
                <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-semibold uppercase tracking-wider w-fit">
                  Current Plan
                </span>
                <button className="flex items-center gap-1.5 text-sm font-medium text-white/90 hover:text-white transition-colors w-fit">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="20" height="14" x="2" y="5" rx="2"/>
                    <line x1="2" x2="22" y1="10" y2="10"/>
                  </svg>
                  Manage Plan
                </button>
              </div>
              
              <h2 className="text-2xl lg:text-4xl font-bold mb-4 lg:mb-6">Developer</h2>
              
              <div className="space-y-3 lg:space-y-4">
                <div className="flex items-center gap-2 text-sm font-medium text-white/90">
                  <span>API Usage</span>
                </div>
                
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-white/80">Monthly plan</span>
                    <span className="text-sm font-semibold">0 /1,000 Credits</span>
                  </div>
                  <div className="h-2 rounded-full bg-white/20 overflow-hidden">
                    <div className="h-full w-0 rounded-full bg-gradient-to-r from-amber-300 to-orange-400" />
                  </div>
                </div>

                <div className="flex items-center gap-3 pt-2">
                  <button className="relative w-12 h-6 rounded-full bg-white/20 transition-colors">
                    <span className="absolute left-1 top-1 w-4 h-4 rounded-full bg-white shadow-sm transition-transform" />
                  </button>
                  <span className="text-sm text-white/90">Pay as you go</span>
                </div>
              </div>
            </div>
          </div>

          {/* API Keys Section */}
          <div className="bg-white rounded-xl lg:rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-slate-100">
              <div className="flex items-center gap-3 lg:gap-4">
                <h3 className="text-lg lg:text-xl font-bold text-slate-900">API Keys</h3>
                <button
                  onClick={openCreateModal}
                  className="w-8 h-8 rounded-lg border border-slate-200 hover:border-slate-300 hover:bg-slate-50 flex items-center justify-center text-slate-500 hover:text-slate-700 transition-all"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14"/>
                    <path d="M12 5v14"/>
                  </svg>
                </button>
              </div>
              <p className="mt-2 text-sm text-slate-500">
                The key is used to authenticate your requests to the API.{" "}
                <a href="#" className="text-blue-600 hover:text-blue-700 underline underline-offset-2">
                  Learn more
                </a>
              </p>
            </div>

            {/* Mobile Cards View */}
            <div className="lg:hidden p-4 space-y-4">
              {isLoading ? (
                <div className="flex flex-col items-center py-8">
                  <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
                  <p className="text-slate-500">Loading API keys...</p>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="flex flex-col items-center py-8">
                  <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                    </svg>
                  </div>
                  <p className="text-slate-500 mb-4">No API keys yet</p>
                  <button
                    onClick={openCreateModal}
                    className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                  >
                    Create your first key
                  </button>
                </div>
              ) : (
                apiKeys.map((apiKey) => (
                  <ApiKeyCard
                    key={apiKey.id}
                    apiKey={apiKey}
                    isRevealed={revealedKeys.has(apiKey.id)}
                    isCopied={copiedId === apiKey.id}
                    isDeleting={deleteConfirm === apiKey.id}
                    onToggleReveal={() => toggleRevealKey(apiKey.id)}
                    onCopy={() => handleCopyKey(apiKey)}
                    onEdit={() => openEditModal(apiKey)}
                    onDelete={() => setDeleteConfirm(apiKey.id)}
                    onCancelDelete={() => setDeleteConfirm(null)}
                    onConfirmDelete={() => handleDeleteKey(apiKey.id)}
                  />
                ))
              )}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider min-w-[180px]">Usage / Limit</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Key</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Options</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-8 h-8 border-2 border-slate-200 border-t-blue-500 rounded-full animate-spin mb-4" />
                          <p className="text-slate-500">Loading API keys...</p>
                        </div>
                      </td>
                    </tr>
                  ) : apiKeys.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-slate-400">
                              <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
                            </svg>
                          </div>
                          <p className="text-slate-500 mb-4">No API keys yet</p>
                          <button
                            onClick={openCreateModal}
                            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors"
                          >
                            Create your first key
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    apiKeys.map((apiKey) => (
                      <tr key={apiKey.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-4">
                          <span className="text-sm font-medium text-slate-900">{apiKey.name}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-medium ${
                            apiKey.type === "prod"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200"
                          }`}>
                            {apiKey.type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <UsageProgress usage={apiKey.usage} limit={apiKey.limit} />
                        </td>
                        <td className="px-6 py-4">
                          <code className="text-sm font-mono text-slate-500 bg-slate-100 px-2.5 py-1 rounded-md">
                            {revealedKeys.has(apiKey.id) ? apiKey.key : maskApiKey(apiKey.key)}
                          </code>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => toggleRevealKey(apiKey.id)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title={revealedKeys.has(apiKey.id) ? "Hide" : "Reveal"}
                            >
                              {revealedKeys.has(apiKey.id) ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                                  <line x1="1" y1="1" x2="23" y2="23"/>
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                                  <circle cx="12" cy="12" r="3"/>
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => handleCopyKey(apiKey)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Copy"
                            >
                              {copiedId === apiKey.id ? (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500">
                                  <polyline points="20 6 9 17 4 12"/>
                                </svg>
                              ) : (
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                              )}
                            </button>
                            <button
                              onClick={() => openEditModal(apiKey)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                              </svg>
                            </button>
                            {deleteConfirm === apiKey.id ? (
                              <div className="flex items-center gap-1 ml-1">
                                <button
                                  onClick={() => handleDeleteKey(apiKey.id)}
                                  className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200 transition-colors"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(apiKey.id)}
                                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="3 6 5 6 21 6"/>
                                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                                  <line x1="10" y1="11" x2="10" y2="17"/>
                                  <line x1="14" y1="11" x2="14" y2="17"/>
                                </svg>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </main>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={resetModalState}
          />
          <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-auto">
            <div className="p-4 lg:p-6 border-b border-slate-100">
              <h2 className="text-lg lg:text-xl font-bold text-slate-900">
                {editingKey ? "Edit API Key" : "Create New API Key"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {editingKey
                  ? "Update the details for this API key"
                  : "Give your new API key a name and select its type"}
              </p>
            </div>
            <div className="p-4 lg:p-6 space-y-4 lg:space-y-5">
              <div>
                <label htmlFor="keyName" className="block text-sm font-medium text-slate-700 mb-2">
                  Key Name
                </label>
                <input
                  id="keyName"
                  type="text"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !isSaving) {
                      editingKey ? handleUpdateKey() : handleCreateKey();
                    }
                  }}
                  placeholder="e.g., Production API Key"
                  className="w-full px-4 py-3 lg:py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-base lg:text-sm"
                  autoFocus
                  disabled={isSaving}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Key Type
                </label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setNewKeyType("dev")}
                    disabled={isSaving}
                    className={`flex-1 px-4 py-3 lg:py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      newKeyType === "dev"
                        ? "border-blue-500 bg-blue-50 text-blue-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    } disabled:opacity-50`}
                  >
                    Development
                  </button>
                  <button
                    onClick={() => setNewKeyType("prod")}
                    disabled={isSaving}
                    className={`flex-1 px-4 py-3 lg:py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      newKeyType === "prod"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    } disabled:opacity-50`}
                  >
                    Production
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="keyLimit" className="block text-sm font-medium text-slate-700 mb-2">
                  Usage Limit
                </label>
                <input
                  id="keyLimit"
                  type="number"
                  min="0"
                  value={newKeyLimit}
                  onChange={(e) => setNewKeyLimit(Math.max(0, parseInt(e.target.value) || 0))}
                  placeholder="1000"
                  className="w-full px-4 py-3 lg:py-2.5 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-base lg:text-sm"
                  disabled={isSaving}
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Maximum number of API calls allowed. Set to 0 for unlimited.
                </p>
              </div>
            </div>
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 p-4 lg:p-6 border-t border-slate-100">
              <button
                onClick={resetModalState}
                disabled={isSaving}
                className="px-5 py-3 sm:py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={editingKey ? handleUpdateKey : handleCreateKey}
                disabled={!newKeyName.trim() || isSaving}
                className="px-5 py-3 sm:py-2.5 rounded-xl bg-slate-900 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition-colors flex items-center justify-center gap-2"
              >
                {isSaving && (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                )}
                {editingKey ? "Update Key" : "Create Key"}
              </button>
            </div>
          </div>
        </div>
      )}

      <NotificationContainer notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <SidebarProvider>
      <DashboardContent />
    </SidebarProvider>
  );
}
