"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { Language, CreateLanguageInput } from "./types";

interface LanguageModalProps {
  isOpen: boolean;
  editingLanguage: Language | null;
  form: CreateLanguageInput;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (updates: Partial<CreateLanguageInput>) => void;
}

export function LanguageModal({
  isOpen,
  editingLanguage,
  form,
  isSaving,
  onClose,
  onSave,
  onChange,
}: LanguageModalProps) {
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && nameRef.current) {
      nameRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) onClose();
    };
    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100">
          <h2 className="text-xl font-bold text-slate-900">
            {editingLanguage ? "Edit Language" : "Add Language"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {editingLanguage
              ? "Update the language details below"
              : "Fill in the details to add a new language"}
          </p>
        </div>

        <div className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Language Name <span className="text-red-500">*</span>
            </label>
            <input
              ref={nameRef}
              type="text"
              value={form.language_name}
              onChange={(e) => onChange({ language_name: e.target.value })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
              placeholder="e.g., Español"
              maxLength={100}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Direction <span className="text-red-500">*</span>
            </label>
            <select
              value={form.direction}
              onChange={(e) => onChange({ direction: parseInt(e.target.value, 10) as 0 | 1 })}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition-all"
            >
              <option value={0}>LTR (Left-to-Right)</option>
              <option value={1}>RTL (Right-to-Left)</option>
            </select>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={isSaving || !form.language_name?.trim()}
            className="px-5 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isSaving ? "Saving..." : editingLanguage ? "Update" : "Create"}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
