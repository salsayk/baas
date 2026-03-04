"use client";

import { useState, useEffect, useCallback } from "react";
import { NotificationContainer, useNotifications } from "@/app/components/notifications";
import { Sidebar, SidebarProvider, MobileMenuButton } from "@/app/components/sidebar";
import { AccountModal } from "@/database/accounts/AccountModal";
import { EmailVerificationModal } from "@/database/accounts/EmailVerificationModal";
import { AccountServiceOfficesModal } from "@/database/Service_Offices/AccountServiceOfficesModal";
import type { Account, CreateAccountInput } from "@/database/accounts/types";

const STATUS_LABELS: Record<number, string> = {
  1: "Active",
  2: "Inactive",
  3: "Deleted",
};

function maskCardNumber(num: string | null): string {
  if (!num) return "—";
  const digits = num.replace(/\D/g, "");
  if (digits.length < 4) return "****";
  return "*".repeat(Math.min(digits.length - 4, 12)) + digits.slice(-4);
}

const defaultForm: CreateAccountInput & { status: number } = {
  account_name: "",
  mobile_phone: null,
  secondary_phone: null,
  email_address: null,
  card_holder_name: null,
  card_number: null,
  card_expiry_month: null,
  card_expiry_year: null,
  card_last_four: null,
  card_cvv: null,
  status: 1,
};

function AccountsContent() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [form, setForm] = useState<CreateAccountInput & { status: number }>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [serviceOfficesAccount, setServiceOfficesAccount] = useState<{
    account_id: number;
    account_name: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifySendError, setVerifySendError] = useState<string | null>(null);
  const [verifyVerifyError, setVerifyVerifyError] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  const {
    notifications,
    dismissNotification,
    notifyCreate,
    notifyUpdate,
    notifyDelete,
    notifyError,
  } = useNotifications();

  const fetchAccounts = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch("/api/accounts");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Failed to fetch (${res.status})`);
      }
      const data = await res.json();
      setAccounts(Array.isArray(data) ? data : []);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to fetch accounts";
      setError(msg);
      setAccounts([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const resetModal = () => {
    setIsModalOpen(false);
    setEditingAccount(null);
    setForm(defaultForm);
  };

  const openCreateModal = () => {
    setEditingAccount(null);
    setForm(defaultForm);
    setIsModalOpen(true);
  };

  const openEditModal = (account: Account) => {
    setEditingAccount(account);
    setForm({
      account_name: account.account_name,
      mobile_phone: account.mobile_phone ?? null,
      secondary_phone: account.secondary_phone ?? null,
      email_address: account.email_address ?? null,
      card_holder_name: account.card_holder_name ?? null,
      card_number: account.card_number ?? null,
      card_expiry_month: account.card_expiry_month ?? null,
      card_expiry_year: account.card_expiry_year ?? null,
      card_last_four: account.card_last_four ?? null,
      card_cvv: account.card_cvv ?? null,
      status: account.status,
    });
    setIsModalOpen(true);
  };

  const normalizeText = (value: string | null | undefined, lowercase = false) => {
    const normalized = (value ?? "").trim();
    return lowercase ? normalized.toLowerCase() : normalized;
  };

  const needEmailVerification = (): boolean => {
    // New account creation always requires verification before save.
    if (!editingAccount) return true;

    // Existing account: require verification if any editable field changed.
    return (
      normalizeText(editingAccount.account_name) !== normalizeText(form.account_name) ||
      normalizeText(editingAccount.mobile_phone) !== normalizeText(form.mobile_phone) ||
      normalizeText(editingAccount.secondary_phone) !== normalizeText(form.secondary_phone) ||
      normalizeText(editingAccount.email_address, true) !== normalizeText(form.email_address, true) ||
      normalizeText(editingAccount.card_holder_name) !== normalizeText(form.card_holder_name) ||
      normalizeText(editingAccount.card_number) !== normalizeText(form.card_number) ||
      (editingAccount.card_expiry_month ?? null) !== (form.card_expiry_month ?? null) ||
      (editingAccount.card_expiry_year ?? null) !== (form.card_expiry_year ?? null) ||
      normalizeText(editingAccount.card_last_four) !== normalizeText(form.card_last_four) ||
      normalizeText(editingAccount.card_cvv) !== normalizeText(form.card_cvv) ||
      editingAccount.status !== form.status
    );
  };

  const performSave = async () => {
    if (!form.account_name?.trim()) return;
    setIsSaving(true);
    try {
      if (editingAccount) {
        const res = await fetch(`/api/accounts/${editingAccount.account_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update");
        }
        const updated = await res.json();
        setAccounts((prev) =>
          prev.map((a) => (a.account_id === updated.account_id ? updated : a))
        );
        notifyUpdate(`Account "${updated.account_name}" updated`);
      } else {
        const res = await fetch("/api/accounts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create");
        }
        const created = await res.json();
        setAccounts((prev) => [created, ...prev]);
        notifyCreate(`Account "${created.account_name}" created`);
      }
      resetModal();
      setVerifyModalOpen(false);
      setVerifyEmail("");
      setVerifySendError(null);
      setVerifyVerifyError(null);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setIsSaving(false);
    }
  };

  const sendVerificationCode = async (email: string) => {
    setIsSendingCode(true);
    setVerifySendError(null);
    try {
      const res = await fetch("/api/account/verify-email/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVerifySendError(data.error || "Failed to send code");
        return false;
      }
      return true;
    } catch {
      setVerifySendError("Failed to send code");
      return false;
    } finally {
      setIsSendingCode(false);
    }
  };

  const handleSave = async () => {
    if (!form.account_name?.trim()) return;
    if (needEmailVerification()) {
      const email = form.email_address?.trim() ?? "";
      if (!email) {
        notifyError("Email address is required to verify account changes.");
        return;
      }
      const ok = await sendVerificationCode(email);
      if (ok) {
        setVerifyEmail(email);
        setVerifyVerifyError(null);
        setVerifyModalOpen(true);
      }
      return;
    }
    await performSave();
  };

  const handleVerified = async (code: string) => {
    setVerifyVerifyError(null);
    setIsVerifyingCode(true);
    try {
      const res = await fetch("/api/account/verify-email/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: verifyEmail, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setVerifyVerifyError(data.error || "Invalid or expired code");
        return;
      }
      await performSave();
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleVerifyModalClose = () => {
    setVerifyModalOpen(false);
    setVerifyEmail("");
    setVerifySendError(null);
    setVerifyVerifyError(null);
  };

  const handleDelete = async (accountId: number) => {
    try {
      const res = await fetch(`/api/accounts/${accountId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      const account = accounts.find((a) => a.account_id === accountId);
      setAccounts((prev) => prev.filter((a) => a.account_id !== accountId));
      setDeleteConfirm(null);
      notifyDelete(`Account "${account?.account_name ?? "Unknown"}" deleted`);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="app-layout-with-sidebar min-h-screen bg-slate-50 flex flex-row">
      <Sidebar />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 lg:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <MobileMenuButton />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 hidden sm:inline">Pages</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="text-slate-700 font-medium">Accounts</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-6 lg:mb-8">
            Manage Accounts
          </h1>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-red-500 flex-shrink-0">
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              <p className="text-sm text-red-700 flex-1">{error}</p>
              <button onClick={() => setError(null)} className="text-red-500 hover:text-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          )}

          <div className="bg-white rounded-xl lg:rounded-2xl border border-slate-200 overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-slate-100">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg lg:text-xl font-bold text-slate-900">Accounts</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Add, edit, or remove accounts stored in PostgreSQL
                  </p>
                </div>
                <button
                  onClick={openCreateModal}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14"/>
                    <path d="M12 5v14"/>
                  </svg>
                  Add Account
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Mobile</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Email</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Card</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 lg:px-6 py-4 text-end text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 lg:px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-10 h-10 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin" />
                          <p className="text-slate-500">Loading accounts...</p>
                        </div>
                      </td>
                    </tr>
                  ) : accounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 lg:px-6 py-16 text-center">
                        <div className="flex flex-col items-center gap-4">
                          <div className="w-14 h-14 rounded-xl bg-slate-100 flex items-center justify-center">
                            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                              <circle cx="9" cy="7" r="4"/>
                              <path d="M22 21v-2a4 4 0 0 0-3-3.87"/>
                              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                            </svg>
                          </div>
                          <div>
                            <p className="text-slate-600 font-medium">No accounts yet</p>
                            <p className="text-slate-500 text-sm mt-1">Create your first account to get started</p>
                          </div>
                          <button
                            onClick={openCreateModal}
                            className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
                          >
                            Add Account
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    accounts.map((account) => (
                      <tr key={account.account_id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="px-4 lg:px-6 py-4">
                          <span className="font-medium text-slate-900">{account.account_name}</span>
                        </td>
                        <td className="px-4 lg:px-6 py-4 hidden sm:table-cell text-sm text-slate-600">
                          {account.mobile_phone || "—"}
                        </td>
                        <td className="px-4 lg:px-6 py-4 hidden md:table-cell text-sm text-slate-600 truncate max-w-[200px]">
                          {account.email_address || "—"}
                        </td>
                        <td className="px-4 lg:px-6 py-4 hidden lg:table-cell">
                          <code className="text-xs font-mono bg-slate-100 px-2 py-1 rounded">
                            {maskCardNumber(account.card_number)}
                          </code>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <span
                            className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-medium ${
                              account.status === 1
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : account.status === 2
                                ? "bg-slate-100 text-slate-600 border border-slate-200"
                                : "bg-red-50 text-red-600 border border-red-200"
                            }`}
                          >
                            {STATUS_LABELS[account.status] ?? "Unknown"}
                          </span>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setServiceOfficesAccount({ account_id: account.account_id, account_name: account.account_name })}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Manage Service Offices"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                                <polyline points="9 22 9 12 15 12 15 22"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => openEditModal(account)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                              </svg>
                            </button>
                            {deleteConfirm === account.account_id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(account.account_id)}
                                  className="px-2 py-1.5 rounded text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-2 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-600 hover:bg-slate-200"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(account.account_id)}
                                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                                title="Delete"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

      <AccountModal
        isOpen={isModalOpen}
        editingAccount={editingAccount}
        form={form}
        isSaving={isSaving}
        onClose={resetModal}
        onSave={handleSave}
        onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
      />

      <EmailVerificationModal
        isOpen={verifyModalOpen}
        email={verifyEmail}
        onClose={handleVerifyModalClose}
        onVerified={handleVerified}
        onResend={() => sendVerificationCode(verifyEmail)}
        isSending={isSendingCode}
        isVerifying={isVerifyingCode}
        sendError={verifySendError}
        verifyError={verifyVerifyError}
      />

      <AccountServiceOfficesModal
        isOpen={serviceOfficesAccount != null}
        account={serviceOfficesAccount}
        onClose={() => setServiceOfficesAccount(null)}
        onNotify={(message, type) => {
          if (type === "create") notifyCreate(message);
          else if (type === "update") notifyUpdate(message);
          else if (type === "delete") notifyDelete(message);
          else notifyError(message);
        }}
      />

      <NotificationContainer notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}

export default function AccountsPage() {
  return (
    <SidebarProvider>
      <AccountsContent />
    </SidebarProvider>
  );
}
