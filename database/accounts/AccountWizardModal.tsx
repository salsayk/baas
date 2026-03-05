"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "@/app/context/TranslationContext";
import { AccountModal } from "@/database/accounts/AccountModal";
import { ServiceOfficeModal } from "@/database/Service_Offices/ServiceOfficeModal";
import { ServiceOfficeUserModal } from "@/database/service_office_users/ServiceOfficeUserModal";
import { EmailVerificationModal } from "@/database/accounts/EmailVerificationModal";
import type { CreateAccountInput } from "@/database/accounts/types";
import type { CreateServiceOfficeInput } from "@/database/Service_Offices/types";
import type { CreateServiceOfficeUserInput, ServiceOfficeUserFormState } from "@/database/service_office_users/types";

const USER_TYPE_LOOKUP_ID = 2;

const defaultAccountForm: CreateAccountInput & { status: number } = {
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

const defaultServiceOfficeForm: CreateServiceOfficeInput & { status: number } = {
  service_office_name: "",
  service_office_description: null,
  account_id: 0,
  country: null,
  status: 1,
};

const defaultUserForm: import("@/database/service_office_users/types").ServiceOfficeUserFormState = {
  user_name: "",
  user_type: 0,
  user_professional_grade: null,
  service_office_id: 0,
  subcontractor_id: null,
  mobile_phone: "",
  secondary_phone: null,
  email_address: "",
  status: 1,
};

interface AccountWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onNotify: (message: string, type: "create" | "error") => void;
}

export function AccountWizardModal({
  isOpen,
  onClose,
  onSuccess,
  onNotify,
}: AccountWizardModalProps) {
  const { t } = useTranslations();
  const [activeTab, setActiveTab] = useState<0 | 1 | 2>(0);
  const [accountForm, setAccountForm] = useState<CreateAccountInput & { status: number }>(defaultAccountForm);
  const [serviceOfficeForm, setServiceOfficeForm] = useState<CreateServiceOfficeInput & { status: number }>(
    defaultServiceOfficeForm
  );
  const [userForm, setUserForm] = useState<ServiceOfficeUserFormState>(defaultUserForm);
  const [supervisorValueId, setSupervisorValueId] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = useState(false);
  const [verifyEmail, setVerifyEmail] = useState("");
  const [verifySendError, setVerifySendError] = useState<string | null>(null);
  const [verifyVerifyError, setVerifyVerifyError] = useState<string | null>(null);
  const [isSendingCode, setIsSendingCode] = useState(false);
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);

  const fetchSupervisorValueId = useCallback(async () => {
    try {
      const res = await fetch(`/api/system-lookup-values?lookup_table_id=${USER_TYPE_LOOKUP_ID}`);
      if (!res.ok) return;
      const data = await res.json();
      const values = Array.isArray(data) ? data : [];
      const supervisor = values.find(
        (v: { value_id: number; value_name: string }) =>
          v.value_name?.toLowerCase().includes("supervisor") ||
          v.value_name?.toLowerCase() === "service office supervisor"
      );
      setSupervisorValueId(supervisor?.value_id ?? values[0]?.value_id ?? null);
    } catch {
      setSupervisorValueId(null);
    }
  }, []);

  useEffect(() => {
    if (isOpen) fetchSupervisorValueId();
  }, [isOpen, fetchSupervisorValueId]);

  useEffect(() => {
    if (supervisorValueId != null && (userForm.user_type === 0 || userForm.user_type == null)) {
      setUserForm((prev) => ({ ...prev, user_type: supervisorValueId }));
    }
  }, [supervisorValueId]);

  const validateTab0 = useCallback((): { valid: boolean; firstInvalidFieldId: string | null; message: string } => {
    if (!accountForm.account_name?.trim()) {
      return { valid: false, firstInvalidFieldId: "account_name", message: "Please enter the account name." };
    }
    if (!accountForm.mobile_phone?.trim()) {
      return { valid: false, firstInvalidFieldId: "mobile_phone", message: "Please enter the mobile phone." };
    }
    if (!accountForm.email_address?.trim()) {
      return { valid: false, firstInvalidFieldId: "email_address", message: "Please enter the email address." };
    }
    if (accountForm.status == null || accountForm.status < 1) {
      return { valid: false, firstInvalidFieldId: "account_status", message: "Please select the status." };
    }
    return { valid: true, firstInvalidFieldId: null, message: "" };
  }, [accountForm.account_name, accountForm.mobile_phone, accountForm.email_address, accountForm.status]);

  const validateTab1 = useCallback((): { valid: boolean; firstInvalidFieldId: string | null; message: string } => {
    if (!serviceOfficeForm.service_office_name?.trim()) {
      return {
        valid: false,
        firstInvalidFieldId: "service_office_name",
        message: "Please enter the service office name.",
      };
    }
    if (serviceOfficeForm.status == null || serviceOfficeForm.status < 1) {
      return {
        valid: false,
        firstInvalidFieldId: "service_office_status",
        message: "Please select the status.",
      };
    }
    return { valid: true, firstInvalidFieldId: null, message: "" };
  }, [serviceOfficeForm.service_office_name, serviceOfficeForm.status]);

  const validateTab2 = useCallback((): { valid: boolean; firstInvalidFieldId: string | null; message: string } => {
    if (!userForm.user_name?.trim()) {
      return { valid: false, firstInvalidFieldId: "user_name", message: "Please enter the user name." };
    }
    const hasUserType = (userForm.user_type != null && userForm.user_type > 0) || (supervisorValueId ?? 0) > 0;
    if (!hasUserType) {
      return { valid: false, firstInvalidFieldId: "user_type", message: "Please select the user type." };
    }
    if (userForm.user_professional_grade == null || userForm.user_professional_grade === undefined) {
      return {
        valid: false,
        firstInvalidFieldId: "user_professional_grade",
        message: "Please select the user professional grade.",
      };
    }
    if (!userForm.mobile_phone?.trim()) {
      return { valid: false, firstInvalidFieldId: "mobile_phone", message: "Please enter the mobile phone." };
    }
    if (!userForm.email_address?.trim()) {
      return { valid: false, firstInvalidFieldId: "email_address", message: "Please enter the email address." };
    }
    if (userForm.status == null || userForm.status < 1) {
      return { valid: false, firstInvalidFieldId: "user_status", message: "Please select the status." };
    }
    return { valid: true, firstInvalidFieldId: null, message: "" };
  }, [userForm.user_name, userForm.user_type, userForm.user_professional_grade, userForm.mobile_phone, userForm.email_address, userForm.status, supervisorValueId]);

  const isAccountValid =
    !!accountForm.account_name?.trim() &&
    !!accountForm.mobile_phone?.trim() &&
    !!accountForm.email_address?.trim() &&
    accountForm.status != null &&
    accountForm.status >= 1;
  const isServiceOfficeValid =
    !!serviceOfficeForm.service_office_name?.trim() &&
    serviceOfficeForm.status != null &&
    serviceOfficeForm.status >= 1;
  const isUserValid =
    !!userForm.user_name?.trim() &&
    (userForm.user_type != null ? userForm.user_type > 0 : (supervisorValueId ?? 0) > 0) &&
    userForm.user_professional_grade != null &&
    userForm.user_professional_grade !== undefined &&
    !!userForm.mobile_phone?.trim() &&
    !!userForm.email_address?.trim() &&
    userForm.status != null &&
    userForm.status >= 1;

  const canSubmit = isAccountValid && isServiceOfficeValid && isUserValid;

  const goToTab = useCallback(
    (targetTab: 0 | 1 | 2) => {
      if (targetTab === activeTab) return;
      if (targetTab < activeTab) {
        setActiveTab(targetTab);
        return;
      }
      if (targetTab === 1) {
        const result = validateTab0();
        if (!result.valid) {
          onNotify(result.message, "error");
          requestAnimationFrame(() => {
            const el = document.getElementById(result.firstInvalidFieldId!);
            el?.focus?.();
            el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
          });
          return;
        }
      } else if (targetTab === 2) {
        const result = validateTab1();
        if (!result.valid) {
          onNotify(result.message, "error");
          requestAnimationFrame(() => {
            const el = document.getElementById(result.firstInvalidFieldId!);
            el?.focus?.();
            el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
          });
          return;
        }
      }
      setActiveTab(targetTab);
    },
    [activeTab, validateTab0, validateTab1, onNotify]
  );

  if (!isOpen) return null;

  const resetWizard = () => {
    setActiveTab(0);
    setAccountForm(defaultAccountForm);
    setServiceOfficeForm(defaultServiceOfficeForm);
    setUserForm(defaultUserForm);
    setVerifyModalOpen(false);
    setVerifyEmail("");
    setVerifySendError(null);
    setVerifyVerifyError(null);
  };

  const sendVerificationCode = async (email: string): Promise<{ ok: boolean; error?: string }> => {
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
        const errMsg = data.error || "Failed to send verification code";
        setVerifySendError(errMsg);
        return { ok: false, error: errMsg };
      }
      return { ok: true };
    } catch {
      const errMsg = "Failed to send verification code";
      setVerifySendError(errMsg);
      return { ok: false, error: errMsg };
    } finally {
      setIsSendingCode(false);
    }
  };

  const performSave = async () => {
    const email = accountForm.email_address?.trim() ?? "";
    if (!email) {
      onNotify("Email address is required to verify account changes.", "error");
      return;
    }
    const result = await sendVerificationCode(email);
    if (result.ok) {
      setVerifyEmail(email);
      setVerifyVerifyError(null);
      setVerifyModalOpen(true);
    } else {
      onNotify(result.error || "Failed to send verification code", "error");
    }
  };

  const executeWizardSave = async () => {
    setIsSaving(true);
    try {
      const accountRes = await fetch("/api/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(accountForm),
      });
      if (!accountRes.ok) {
        const data = await accountRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create account");
      }
      const account = await accountRes.json();

      const soRes = await fetch("/api/service-offices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...serviceOfficeForm,
          account_id: account.account_id,
        }),
      });
      if (!soRes.ok) {
        const data = await soRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create service office");
      }
      const serviceOffice = await soRes.json();

      const userRes = await fetch("/api/service-office-users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...userForm,
          service_office_id: serviceOffice.service_office_id,
          user_type: supervisorValueId ?? userForm.user_type,
          user_professional_grade: userForm.user_professional_grade!,
        }),
      });
      if (!userRes.ok) {
        const data = await userRes.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create user");
      }

      onNotify(`Account "${account.account_name}" created with service office and supervisor`, "create");
      resetWizard();
      onClose();
      onSuccess();
    } catch (err) {
      onNotify(err instanceof Error ? err.message : "Operation failed", "error");
    } finally {
      setIsSaving(false);
    }
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
      await executeWizardSave();
      setVerifyModalOpen(false);
      setVerifyEmail("");
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const handleCreateClick = () => {
    const result = validateTab2();
    if (!result.valid) {
      onNotify(result.message, "error");
      requestAnimationFrame(() => {
        const el = document.getElementById(result.firstInvalidFieldId!);
        el?.focus?.();
        el?.scrollIntoView?.({ behavior: "smooth", block: "center" });
      });
      return;
    }
    performSave();
  };

  const handleWizardClose = () => {
    resetWizard();
    onClose();
  };

  const tabs = [
    { id: 0 as const, label: "Account", valid: isAccountValid },
    { id: 1 as const, label: "Service Office", valid: isServiceOfficeValid },
    { id: 2 as const, label: "User (Supervisor)", valid: isUserValid },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={handleWizardClose}
          aria-hidden="true"
        />
        <div className="relative w-full sm:max-w-2xl bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="flex-shrink-0 p-6 border-b border-slate-100">
            <h2 className="text-xl font-bold text-slate-900">{t("New Account Wizard")}</h2>
            <p className="mt-1 text-sm text-slate-500">
              {t("Create an account with its first service office and supervisor user")}
            </p>
            <div className="mt-4 flex gap-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => goToTab(tab.id)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-violet-600 text-white"
                      : tab.valid
                      ? "bg-slate-100 text-slate-700 hover:bg-slate-200"
                      : "bg-slate-50 text-slate-400"
                  }`}
                >
                  {tab.label}
                  {tab.valid && (
                    <span className="ml-1.5 text-emerald-500" aria-hidden>
                      ✓
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto p-6">
            {activeTab === 0 && (
              <AccountModal
                isOpen
                editingAccount={null}
                form={accountForm}
                isSaving={false}
                embedded
                onClose={() => {}}
                onSave={() => {}}
                onChange={(u) => setAccountForm((prev) => ({ ...prev, ...u }))}
              />
            )}
            {activeTab === 1 && (
              <ServiceOfficeModal
                isOpen
                editingOffice={null}
                form={{ ...serviceOfficeForm, account_id: 0 }}
                accounts={[]}
                isSaving={false}
                embedded
                fixedAccountName={accountForm.account_name || undefined}
                onClose={() => {}}
                onSave={() => {}}
                onChange={(u) => setServiceOfficeForm((prev) => ({ ...prev, ...u }))}
              />
            )}
            {activeTab === 2 && (
              <ServiceOfficeUserModal
                isOpen
                editingUser={null}
                form={{ ...userForm, service_office_id: 0 }}
                serviceOffices={[]}
                subcontractors={[]}
                isSaving={false}
                fixedServiceOfficeId={null}
                embedded
                fixedServiceOfficeName={serviceOfficeForm.service_office_name || undefined}
                fixedUserTypeValueId={supervisorValueId ?? undefined}
                onClose={() => {}}
                onSave={() => {}}
                onChange={(u) => setUserForm((prev) => ({ ...prev, ...u }))}
              />
            )}
          </div>

          <div className="flex-shrink-0 flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-2 sm:gap-3 p-6 border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={handleWizardClose}
              disabled={isSaving}
              className="px-5 py-3 sm:py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100"
            >
              {t("Cancel")}
            </button>
            <div className="flex gap-2">
              {activeTab > 0 && (
                <button
                  type="button"
                  onClick={() => setActiveTab((activeTab - 1) as 0 | 1)}
                  disabled={isSaving}
                  className="px-5 py-3 sm:py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 border border-slate-200"
                >
                  Back
                </button>
              )}
              {activeTab < 2 ? (
                <button
                  type="button"
                  onClick={() => goToTab((activeTab + 1) as 1 | 2)}
                  disabled={isSaving}
                  className="px-5 py-3 sm:py-2.5 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50"
                >
                  {t("Next")}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateClick}
                  disabled={isSaving}
                  className="px-5 py-3 sm:py-2.5 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50 flex items-center gap-2"
                >
                  {isSaving && (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                  {t("Create Account")}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <EmailVerificationModal
        isOpen={verifyModalOpen}
        email={verifyEmail}
        onClose={() => {
          setVerifyModalOpen(false);
          setVerifyEmail("");
          setVerifySendError(null);
          setVerifyVerifyError(null);
        }}
        onVerified={handleVerified}
        onResend={() => sendVerificationCode(verifyEmail)}
        isSending={isSendingCode}
        isVerifying={isVerifyingCode}
        sendError={verifySendError}
        verifyError={verifyVerifyError}
      />
    </>
  );
}
