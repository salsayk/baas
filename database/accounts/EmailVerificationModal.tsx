"use client";

import { useState, useRef, useEffect } from "react";

interface EmailVerificationModalProps {
  isOpen: boolean;
  email: string;
  onClose: () => void;
  onVerified: (code: string) => void;
  onResend?: () => void;
  isSending?: boolean;
  isVerifying?: boolean;
  sendError?: string | null;
  verifyError?: string | null;
}

export function EmailVerificationModal({
  isOpen,
  email,
  onClose,
  onVerified,
  onResend,
  isSending = false,
  isVerifying = false,
  sendError = null,
  verifyError = null,
}: EmailVerificationModalProps) {
  const [code, setCode] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) {
      setCode("");
      setResendCooldown(0);
      return;
    }
    inputRef.current?.focus();
  }, [isOpen]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const digits = code.replace(/\D/g, "").slice(0, 6);
  const canSubmit = digits.length === 6 && !isVerifying;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    onVerified(digits);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    setCode(pasted);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl p-6">
        <h2 className="text-xl font-bold text-slate-900">
          Verify your email
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          We sent a 6-digit code to <strong className="text-slate-700">{email}</strong>. Enter it below.
        </p>

        {sendError && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {sendError}
          </div>
        )}

        {verifyError && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 text-sm text-red-700">
            {verifyError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label htmlFor="verification-code" className="block text-sm font-medium text-slate-700 mb-2">
              Verification code
            </label>
            <input
              ref={inputRef}
              id="verification-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={handleInputChange}
              onPaste={handlePaste}
              placeholder="000000"
              disabled={isVerifying}
              className="w-full px-4 py-4 rounded-xl border border-slate-200 text-slate-900 text-center text-2xl font-mono tracking-[0.5em] placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="submit"
              disabled={!canSubmit}
              className="w-full py-3 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
            >
              {isVerifying && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {isVerifying ? "Verifying…" : "Verify"}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isVerifying}
              className="w-full py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </form>

        <p className="mt-4 text-center text-sm text-slate-500">
          Didn&apos;t receive the code?{" "}
          <button
            type="button"
            disabled={isSending || resendCooldown > 0}
            onClick={() => {
              setResendCooldown(60);
              setCode("");
              inputRef.current?.focus();
              onResend?.();
            }}
            className="text-violet-600 font-medium hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : isSending
              ? "Sending…"
              : "Resend code"}
          </button>
        </p>
      </div>
    </div>
  );
}
