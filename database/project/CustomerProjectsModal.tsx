"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "@/app/context/TranslationContext";
import { ProjectModal } from "@/database/project/ProjectModal";
import type { Project, CreateProjectInput } from "@/database/project/types";

const STATUS_LABELS: Record<number, string> = {
  1: "Active",
  2: "Inactive",
  3: "Deleted",
};

const defaultForm: CreateProjectInput & { status: number } = {
  project_name: "",
  service_office_id: 0,
  customer_id: 0,
  project_scope_description: "",
  status: 1,
};

interface CustomerProjectsModalProps {
  isOpen: boolean;
  context: {
    service_office_id: number;
    service_office_name: string;
    customer_id: number;
    customer_name: string;
  } | null;
  onClose: () => void;
  onNotify: (message: string, type: "create" | "update" | "delete" | "error") => void;
}

export function CustomerProjectsModal({ isOpen, context, onClose, onNotify }: CustomerProjectsModalProps) {
  const { t } = useTranslations();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState<CreateProjectInput & { status: number }>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchProjects = useCallback(async () => {
    if (!context || !isOpen) return;
    setIsLoading(true);
    try {
      const res = await fetch(
        `/api/projects?service_office_id=${context.service_office_id}&customer_id=${context.customer_id}`
      );
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch {
      setProjects([]);
      onNotify("Failed to load projects", "error");
    } finally {
      setIsLoading(false);
    }
  }, [context?.customer_id, context?.service_office_id, isOpen, onNotify]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingProject(null);
    setForm({
      ...defaultForm,
      service_office_id: context?.service_office_id ?? 0,
      customer_id: context?.customer_id ?? 0,
    });
  };

  const openAddForm = () => {
    setEditingProject(null);
    setForm({
      ...defaultForm,
      service_office_id: context?.service_office_id ?? 0,
      customer_id: context?.customer_id ?? 0,
    });
    setIsFormOpen(true);
  };

  const openEditForm = (project: Project) => {
    setEditingProject(project);
    setForm({
      project_name: project.project_name,
      service_office_id: project.service_office_id,
      customer_id: project.customer_id,
      project_scope_description: project.project_scope_description,
      status: project.status,
    });
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!context || !form.project_name?.trim() || !form.project_scope_description?.trim()) return;
    setIsSaving(true);
    try {
      if (editingProject) {
        const res = await fetch(`/api/projects/${editingProject.project_id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project_name: form.project_name,
            project_scope_description: form.project_scope_description,
            status: form.status,
          }),
        });
        if (!res.ok) throw new Error("Failed to update");
        const updated = await res.json();
        setProjects((prev) => prev.map((p) => (p.project_id === updated.project_id ? updated : p)));
        onNotify(`"${updated.project_name}" updated`, "update");
      } else {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            service_office_id: context.service_office_id,
            customer_id: context.customer_id,
          }),
        });
        if (!res.ok) throw new Error("Failed to create");
        const created = await res.json();
        setProjects((prev) => [created, ...prev]);
        onNotify(`"${created.project_name}" created`, "create");
      }
      resetForm();
    } catch {
      onNotify("Operation failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (projectId: number) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      const project = projects.find((p) => p.project_id === projectId);
      setProjects((prev) => prev.filter((p) => p.project_id !== projectId));
      setDeleteConfirm(null);
      onNotify(`"${project?.project_name ?? "Project"}" deleted`, "delete");
    } catch {
      onNotify("Delete failed", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[40] flex items-center justify-center p-4">
        <div className="absolute inset-0 backdrop-blur-sm" style={{ backgroundColor: "rgba(0,0,0,0.4)" }} onClick={onClose} aria-hidden="true" />
        <div className="relative w-full max-w-5xl max-h-[96vh] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="p-4 lg:p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{t("Projects")} — {context?.customer_name ?? ""}</h2>
              <p className="mt-1 text-sm text-slate-500">{t("Manage projects for this customer")}</p>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl">
                <select
                  value={context?.service_office_id ?? ""}
                  disabled
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700"
                >
                  {context ? <option value={context.service_office_id}>{context.service_office_name}</option> : null}
                </select>
                <select
                  value={context?.customer_id ?? ""}
                  disabled
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700"
                >
                  {context ? <option value={context.customer_id}>{context.customer_name}</option> : null}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openAddForm}
                disabled={!context}
                className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
              >
                {t("Add Project")}
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18"/>
                  <line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Name</th>
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">{t("Scope")}</th>
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase">Status</th>
                  <th className="px-4 lg:px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan={4} className="px-4 lg:px-6 py-12 text-center text-slate-500">Loading...</td></tr>
                ) : projects.length === 0 ? (
                  <tr><td colSpan={4} className="px-4 lg:px-6 py-12 text-center text-slate-500">{t("No projects yet.")}</td></tr>
                ) : (
                  projects.map((project) => (
                    <tr key={project.project_id} className="hover:bg-slate-50/50">
                      <td className="px-4 lg:px-6 py-3 font-medium text-slate-900">{project.project_name}</td>
                      <td className="px-4 lg:px-6 py-3 hidden md:table-cell text-sm text-slate-600">{project.project_scope_description}</td>
                      <td className="px-4 lg:px-6 py-3 text-sm text-slate-700">{STATUS_LABELS[project.status] ?? "Unknown"}</td>
                      <td className="px-4 lg:px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => openEditForm(project)} className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600" title="Edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                            </svg>
                          </button>
                          {deleteConfirm === project.project_id ? (
                            <>
                              <button onClick={() => handleDelete(project.project_id)} className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200">Confirm</button>
                              <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600">Cancel</button>
                            </>
                          ) : (
                            <button onClick={() => setDeleteConfirm(project.project_id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Delete">
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="3 6 5 6 21 6"/>
                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
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

      <ProjectModal
        isOpen={isFormOpen}
        editingProject={editingProject}
        form={form}
        serviceOffices={
          context
            ? [{ service_office_id: context.service_office_id, service_office_name: context.service_office_name }]
            : []
        }
        customers={context ? [{ customer_id: context.customer_id, customer_name: context.customer_name }] : []}
        fixedServiceOfficeId={context?.service_office_id ?? null}
        fixedCustomerId={context?.customer_id ?? null}
        isSaving={isSaving}
        onClose={resetForm}
        onSave={handleSave}
        onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
      />
    </>
  );
}
