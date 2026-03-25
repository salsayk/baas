"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "@/app/context/TranslationContext";
import { NotificationContainer, useNotifications } from "@/app/components/notifications";
import { Sidebar, SidebarProvider, MobileMenuButton } from "@/app/components/sidebar";
import { ProjectModal } from "@/database/project/ProjectModal";
import { AssignContractsModal } from "@/database/project/AssignContractsModal";
import type { Project, CreateProjectInput } from "@/database/project/types";
import type { ServiceOffice } from "@/database/Service_Offices/types";
import type { Customer } from "@/database/customer/types";

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

function ProjectsContent() {
  const { t, refreshTranslations } = useTranslations();

  useEffect(() => {
    refreshTranslations();
  }, [refreshTranslations]);
  const searchParams = useSearchParams();
  const fixedServiceOfficeIdParam = searchParams.get("service_office_id");
  const fixedCustomerIdParam = searchParams.get("customer_id");
  const fixedServiceOfficeId = fixedServiceOfficeIdParam ? parseInt(fixedServiceOfficeIdParam, 10) : null;
  const fixedCustomerId = fixedCustomerIdParam ? parseInt(fixedCustomerIdParam, 10) : null;

  const [serviceOffices, setServiceOffices] = useState<ServiceOffice[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedServiceOfficeId, setSelectedServiceOfficeId] = useState<number | "">("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<number | "">("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [form, setForm] = useState<CreateProjectInput & { status: number }>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [assignContractsProject, setAssignContractsProject] = useState<Project | null>(null);
  const [isLoadingOffices, setIsLoadingOffices] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const { notifications, dismissNotification, notifyCreate, notifyUpdate, notifyDelete, notifyError } = useNotifications();

  const customerOptions = useMemo(
    () => customers.map((c) => ({ customer_id: c.customer_id, customer_name: c.customer_name })),
    [customers]
  );

  const fetchServiceOffices = useCallback(async () => {
    try {
      const res = await fetch("/api/service-offices");
      if (!res.ok) throw new Error("Failed to fetch service offices");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setServiceOffices(list);

      if (fixedServiceOfficeId && !isNaN(fixedServiceOfficeId)) {
        setSelectedServiceOfficeId(fixedServiceOfficeId);
      } else if (list.length > 0 && selectedServiceOfficeId === "") {
        setSelectedServiceOfficeId(list[0].service_office_id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch service offices");
      setServiceOffices([]);
    } finally {
      setIsLoadingOffices(false);
    }
  }, [fixedServiceOfficeId, selectedServiceOfficeId]);

  const fetchCustomers = useCallback(async () => {
    if (selectedServiceOfficeId === "") {
      setCustomers([]);
      setIsLoadingCustomers(false);
      return;
    }
    setIsLoadingCustomers(true);
    try {
      setError(null);
      const res = await fetch(`/api/customers?service_office_id=${selectedServiceOfficeId}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch customers");
      }
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      setCustomers(list);

      if (fixedCustomerId && !isNaN(fixedCustomerId)) {
        setSelectedCustomerId(fixedCustomerId);
      } else if (list.length > 0) {
        const stillExists = list.some((c) => c.customer_id === selectedCustomerId);
        setSelectedCustomerId(stillExists ? selectedCustomerId : list[0].customer_id);
      } else {
        setSelectedCustomerId("");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch customers");
      setCustomers([]);
      setSelectedCustomerId("");
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [fixedCustomerId, selectedServiceOfficeId]);

  const fetchProjects = useCallback(async () => {
    if (selectedServiceOfficeId === "" || selectedCustomerId === "") {
      setProjects([]);
      setIsLoadingProjects(false);
      return;
    }
    setIsLoadingProjects(true);
    try {
      setError(null);
      const res = await fetch(
        `/api/projects?service_office_id=${selectedServiceOfficeId}&customer_id=${selectedCustomerId}`
      );
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch projects");
      }
      const data = await res.json();
      setProjects(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch projects");
      setProjects([]);
    } finally {
      setIsLoadingProjects(false);
    }
  }, [selectedCustomerId, selectedServiceOfficeId]);

  useEffect(() => {
    fetchServiceOffices();
  }, [fetchServiceOffices]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const resetModal = () => {
    setIsModalOpen(false);
    setEditingProject(null);
    setForm({
      ...defaultForm,
      service_office_id: selectedServiceOfficeId === "" ? 0 : selectedServiceOfficeId,
      customer_id: selectedCustomerId === "" ? 0 : selectedCustomerId,
    });
  };

  const openCreateModal = () => {
    setEditingProject(null);
    setForm({
      ...defaultForm,
      service_office_id: selectedServiceOfficeId === "" ? 0 : selectedServiceOfficeId,
      customer_id: selectedCustomerId === "" ? 0 : selectedCustomerId,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    setForm({
      project_name: project.project_name,
      service_office_id: project.service_office_id,
      customer_id: project.customer_id,
      project_scope_description: project.project_scope_description,
      status: project.status,
    });
    setIsModalOpen(true);
  };

  const openCopyModal = (project: Project) => {
    setEditingProject(null);
    setForm({
      project_name: "copy of " + (project.project_name ?? ""),
      service_office_id: project.service_office_id,
      customer_id: project.customer_id,
      project_scope_description: project.project_scope_description,
      status: project.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.project_name?.trim() || !form.project_scope_description?.trim() || !form.service_office_id || !form.customer_id) return;
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
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update");
        }
        const updated = await res.json();
        const updatedId = Number(updated.project_id);
        setProjects((prev) => prev.map((p) => (Number(p.project_id) === updatedId ? { ...p, ...updated, project_id: updatedId } : p)));
        notifyUpdate(`"${updated.project_name}" updated`);
        await fetchProjects();
      } else {
        const res = await fetch("/api/projects", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create");
        }
        const created = await res.json();
        setProjects((prev) => [created, ...prev]);
        notifyCreate(`"${created.project_name}" created`);
      }
      resetModal();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (projectId: number) => {
    try {
      const res = await fetch(`/api/projects/${projectId}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      const project = projects.find((p) => p.project_id === projectId);
      setProjects((prev) => prev.filter((p) => p.project_id !== projectId));
      setDeleteConfirm(null);
      notifyDelete(`"${project?.project_name ?? "Project"}" deleted`);
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <div className="app-layout-with-sidebar min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-row">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-14 lg:h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <MobileMenuButton />
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-400 hidden sm:inline">Pages</span>
              <span className="text-slate-300 hidden sm:inline">/</span>
              <span className="text-slate-700 font-medium">Projects</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-6 lg:mb-8">{t("Projects")}</h1>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-xl lg:rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-slate-100">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <h2 className="text-lg lg:text-xl font-bold text-slate-900">{t("By service office and customer")}</h2>
                  <p className="mt-1 text-sm text-slate-500">{t("Select service office and customer to manage projects")}</p>
                </div>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <select
                    value={selectedServiceOfficeId === "" ? "" : selectedServiceOfficeId}
                    onChange={(e) => {
                      const val = e.target.value ? parseInt(e.target.value, 10) : "";
                      setSelectedServiceOfficeId(val);
                      if (val !== "") setSelectedCustomerId("");
                    }}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 min-w-[220px]"
                    disabled={isLoadingOffices || !!fixedServiceOfficeId}
                  >
                    <option value="">Select service office</option>
                    {serviceOffices.map((s) => (
                      <option key={s.service_office_id} value={s.service_office_id}>
                        {s.service_office_name}
                      </option>
                    ))}
                  </select>
                  <select
                    value={selectedCustomerId === "" ? "" : selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value ? parseInt(e.target.value, 10) : "")}
                    className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-900 min-w-[220px]"
                    disabled={isLoadingCustomers || selectedServiceOfficeId === "" || !!fixedCustomerId}
                  >
                    <option value="">Select customer</option>
                    {customers.map((c) => (
                      <option key={c.customer_id} value={c.customer_id}>
                        {c.customer_name}
                      </option>
                    ))}
                  </select>
                  <button
                    onClick={openCreateModal}
                    disabled={!selectedServiceOfficeId || !selectedCustomerId || isLoadingOffices || isLoadingCustomers}
                    className="px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 disabled:opacity-50"
                  >
                    {t("Add Project")}
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">Name</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">{t("Scope Description")}</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 lg:px-6 py-4 text-end text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingProjects ? (
                    <tr><td colSpan={4} className="px-4 lg:px-6 py-16 text-center text-slate-500">{t("Loading projects...")}</td></tr>
                  ) : selectedServiceOfficeId === "" || selectedCustomerId === "" ? (
                    <tr><td colSpan={4} className="px-4 lg:px-6 py-16 text-center text-slate-500">{t("Select service office and customer to view projects")}</td></tr>
                  ) : projects.length === 0 ? (
                    <tr><td colSpan={4} className="px-4 lg:px-6 py-16 text-center text-slate-500">No projects yet. Add one for this customer.</td></tr>
                  ) : (
                    projects.map((project) => (
                      <tr key={project.project_id} className="hover:bg-slate-50/50">
                        <td className="px-4 lg:px-6 py-4 font-medium text-slate-900">{project.project_name}</td>
                        <td className="px-4 lg:px-6 py-4 hidden md:table-cell text-sm text-slate-600">
                          {project.project_scope_description}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-slate-700">{STATUS_LABELS[project.status] ?? "Unknown"}</td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setAssignContractsProject(project)}
                              className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                              title={t("Assign Contracts")}
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                                <polyline points="14 2 14 8 20 8"/>
                                <line x1="16" y1="13" x2="8" y2="13"/>
                                <line x1="16" y1="17" x2="8" y2="17"/>
                                <polyline points="10 9 9 9 8 9"/>
                              </svg>
                            </button>
                            <button onClick={() => openCopyModal(project)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" title="Copy">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                              </svg>
                            </button>
                            <button onClick={() => openEditModal(project)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300" title="Edit">
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                              </svg>
                            </button>
                            {deleteConfirm === project.project_id ? (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleDelete(project.project_id)} className="px-2 py-1.5 rounded text-xs font-medium bg-red-100 text-red-600">Confirm</button>
                                <button onClick={() => setDeleteConfirm(null)} className="px-2 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-600">Cancel</button>
                              </div>
                            ) : (
                              <button onClick={() => setDeleteConfirm(project.project_id)} className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500" title="Delete">
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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
      </main>

      <AssignContractsModal
        isOpen={!!assignContractsProject}
        project={assignContractsProject}
        onClose={() => setAssignContractsProject(null)}
        onSaved={() => {
          notifyUpdate("Contract assignments updated");
        }}
      />

      <ProjectModal
        isOpen={isModalOpen}
        editingProject={editingProject}
        form={form}
        serviceOffices={serviceOffices.map((s) => ({
          service_office_id: s.service_office_id,
          service_office_name: s.service_office_name,
        }))}
        customers={customerOptions}
        fixedServiceOfficeId={selectedServiceOfficeId === "" ? null : selectedServiceOfficeId}
        fixedCustomerId={selectedCustomerId === "" ? null : selectedCustomerId}
        isSaving={isSaving}
        onClose={resetModal}
        onSave={handleSave}
        onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
      />

      <NotificationContainer notifications={notifications} onDismiss={dismissNotification} />
    </div>
  );
}

export default function ProjectsPage() {
  return (
    <SidebarProvider>
      <ProjectsContent />
    </SidebarProvider>
  );
}
