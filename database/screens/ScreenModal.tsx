"use client";

import type { UiScreen, CreateUiScreenInput } from "@/database/screens/types";

interface ScreenModalProps {
  isOpen: boolean;
  editingScreen: UiScreen | null;
  form: CreateUiScreenInput;
  isSaving: boolean;
  onClose: () => void;
  onSave: () => void;
  onChange: (updates: Partial<CreateUiScreenInput>) => void;
}

export function ScreenModal({
  isOpen,
  editingScreen,
  form,
  isSaving,
  onClose,
  onSave,
  onChange,
}: ScreenModalProps) {
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full sm:max-w-lg bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[96vh] overflow-auto">
        <div className="sticky top-0 bg-white p-6 border-b border-slate-100 rounded-t-2xl sm:rounded-t-2xl z-10">
          <h2 className="text-xl font-bold text-slate-900">
            {editingScreen ? "Edit Screen" : "Add Screen"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {editingScreen
              ? "Update the screen details"
              : "Enter a name and optional description for the screen"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label htmlFor="screen_name" className="block text-sm font-medium text-slate-700 mb-2">
              Screen name <span className="text-red-500">*</span>
            </label>
            <input
              id="screen_name"
              type="text"
              maxLength={100}
              value={form.screen_name ?? ""}
              onChange={(e) => onChange({ screen_name: e.target.value })}
              placeholder="e.g. User, Account"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              required
              disabled={isSaving}
            />
          </div>
          <div>
            <label htmlFor="screen_description" className="block text-sm font-medium text-slate-700 mb-2">
              Description
            </label>
            <input
              id="screen_description"
              type="text"
              maxLength={250}
              value={form.screen_description ?? ""}
              onChange={(e) => onChange({ screen_description: e.target.value || null })}
              placeholder="Optional description"
              className="w-full px-4 py-3 rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition-all"
              disabled={isSaving}
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2 sm:gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-5 py-3 sm:py-2.5 rounded-xl text-slate-600 font-medium hover:bg-slate-100 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!form.screen_name?.trim() || isSaving}
              className="px-5 py-3 sm:py-2.5 rounded-xl bg-violet-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-violet-700 transition-colors flex items-center justify-center gap-2"
            >
              {isSaving && (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              )}
              {editingScreen ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
