"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { NotificationContainer, useNotifications } from "@/app/components/notifications";
import { Sidebar, SidebarProvider, MobileMenuButton } from "@/app/components/sidebar";
import { CustomerModal } from "@/database/customer/CustomerModal";
import { CustomerProjectsModal } from "@/database/project/CustomerProjectsModal";
import type { Customer, CreateCustomerInput } from "@/database/customer/types";
import type { ServiceOffice } from "@/database/Service_Offices/types";

const STATUS_LABELS: Record<number, string> = {
  1: "Active",
  2: "Inactive",
  3: "Deleted",
};

const defaultForm: CreateCustomerInput & { status: number } = {
  customer_name: "",
  service_office_id: 0,
  legal_id: null,
  mobile_phone: null,
  secondary_phone: null,
  email_address: "",
  address_country: null,
  address_city: null,
  address_street: null,
  address_street_number: null,
  address_zip_code: null,
  status: 1,
};

function CustomersContent() {
  const searchParams = useSearchParams();
  const fixedServiceOfficeIdParam = searchParams.get("service_office_id");
  const fixedServiceOfficeId = fixedServiceOfficeIdParam ? parseInt(fixedServiceOfficeIdParam, 10) : null;

  const [serviceOffices, setServiceOffices] = useState<ServiceOffice[]>([]);
  const [selectedServiceOfficeId, setSelectedServiceOfficeId] = useState<number | "">("");
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [projectsContext, setProjectsContext] = useState<{
    service_office_id: number;
    service_office_name: string;
    customer_id: number;
    customer_name: string;
  } | null>(null);
  const [form, setForm] = useState<CreateCustomerInput & { status: number }>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isLoadingOffices, setIsLoadingOffices] = useState(true);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const {
    notifications,
    dismissNotification,
    notifyCreate,
    notifyUpdate,
    notifyDelete,
    notifyError,
  } = useNotifications();

  const selectedOffice = useMemo(
    () => serviceOffices.find((s) => s.service_office_id === selectedServiceOfficeId) ?? null,
    [serviceOffices, selectedServiceOfficeId]
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
      const url = "/api/customers?service_office_id=" + selectedServiceOfficeId;
      const res = await fetch(url);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to fetch customers");
      }
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch customers");
      setCustomers([]);
    } finally {
      setIsLoadingCustomers(false);
    }
  }, [selectedServiceOfficeId]);

  useEffect(() => {
    fetchServiceOffices();
  }, [fetchServiceOffices]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const resetModal = () => {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setForm({
      ...defaultForm,
      service_office_id: selectedServiceOfficeId === "" ? 0 : selectedServiceOfficeId,
    });
  };

  const openCreateModal = () => {
    setEditingCustomer(null);
    setForm({
      ...defaultForm,
      service_office_id: selectedServiceOfficeId === "" ? 0 : selectedServiceOfficeId,
    });
    setIsModalOpen(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingCustomer(customer);
    setForm({
      customer_name: customer.customer_name,
      service_office_id: customer.service_office_id,
      legal_id: customer.legal_id,
      mobile_phone: customer.mobile_phone,
      secondary_phone: customer.secondary_phone,
      email_address: customer.email_address,
      address_country: customer.address_country,
      address_city: customer.address_city,
      address_street: customer.address_street,
      address_street_number: customer.address_street_number,
      address_zip_code: customer.address_zip_code,
      status: customer.status,
    });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!form.customer_name?.trim() || !form.email_address?.trim() || !form.service_office_id) return;
    setIsSaving(true);
    try {
      if (editingCustomer) {
        const res = await fetch("/api/customers/" + editingCustomer.customer_id, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            customer_name: form.customer_name,
            legal_id: form.legal_id,
            mobile_phone: form.mobile_phone,
            secondary_phone: form.secondary_phone,
            email_address: form.email_address,
            address_country: form.address_country,
            address_city: form.address_city,
            address_street: form.address_street,
            address_street_number: form.address_street_number,
            address_zip_code: form.address_zip_code,
            status: form.status,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to update");
        }
        const updated = await res.json();
        setCustomers((prev) => prev.map((c) => (c.customer_id === updated.customer_id ? updated : c)));
        notifyUpdate(`"${updated.customer_name}" updated`);
      } else {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to create");
        }
        const created = await res.json();
        setCustomers((prev) => [created, ...prev]);
        notifyCreate(`"${created.customer_name}" created`);
      }
      resetModal();
    } catch (err) {
      notifyError(err instanceof Error ? err.message : "Operation failed");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (customerId: number) => {
    try {
      const res = await fetch("/api/customers/" + customerId, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete");
      }
      const customer = customers.find((c) => c.customer_id === customerId);
      setCustomers((prev) => prev.filter((c) => c.customer_id !== customerId));
      setDeleteConfirm(null);
      notifyDelete(`"${customer?.customer_name ?? "Customer"}" deleted`);
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
              <span className="text-slate-700 font-medium">Customers</span>
            </div>
          </div>
        </header>

        <div className="flex-1 p-4 lg:p-8 overflow-auto">
          <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 mb-6 lg:mb-8">Customers</h1>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-xl lg:rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-4 lg:p-6 border-b border-slate-100">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <h2 className="text-lg lg:text-xl font-bold text-slate-900">By service office</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Select a service office to view and manage its customers
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <select
                    value={selectedServiceOfficeId === "" ? "" : selectedServiceOfficeId}
                    onChange={(e) => setSelectedServiceOfficeId(e.target.value ? parseInt(e.target.value, 10) : "")}
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
                  <button
                    onClick={openCreateModal}
                    disabled={!selectedServiceOfficeId || isLoadingOffices}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
                  >
                    Add Customer
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">Name</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase hidden md:table-cell">Email</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase hidden sm:table-cell">Mobile</th>
                    <th className="px-4 lg:px-6 py-4 text-start text-xs font-semibold text-slate-500 uppercase">Status</th>
                    <th className="px-4 lg:px-6 py-4 text-end text-xs font-semibold text-slate-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {isLoadingCustomers ? (
                    <tr>
                      <td colSpan={5} className="px-4 lg:px-6 py-16 text-center text-slate-500">
                        Loading customers...
                      </td>
                    </tr>
                  ) : selectedServiceOfficeId === "" ? (
                    <tr>
                      <td colSpan={5} className="px-4 lg:px-6 py-16 text-center text-slate-500">
                        Select a service office to view customers
                      </td>
                    </tr>
                  ) : customers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 lg:px-6 py-16 text-center text-slate-500">
                        No customers yet. Add one for this service office.
                      </td>
                    </tr>
                  ) : (
                    customers.map((customer) => (
                      <tr key={customer.customer_id} className="hover:bg-slate-50/50">
                        <td className="px-4 lg:px-6 py-4 font-medium text-slate-900">{customer.customer_name}</td>
                        <td className="px-4 lg:px-6 py-4 hidden md:table-cell text-sm text-slate-600">{customer.email_address}</td>
                        <td className="px-4 lg:px-6 py-4 hidden sm:table-cell text-sm text-slate-600">{customer.mobile_phone || "—"}</td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-slate-700">{STATUS_LABELS[customer.status] ?? "Unknown"}</td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                if (!selectedOffice) return;
                                setProjectsContext({
                                  service_office_id: customer.service_office_id,
                                  service_office_name: selectedOffice.service_office_name,
                                  customer_id: customer.customer_id,
                                  customer_name: customer.customer_name,
                                });
                              }}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                              title="Manage projects"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M2 20h20"/>
                                <path d="M5 20V9l7-5 7 5v11"/>
                                <path d="M9 13h6"/>
                              </svg>
                            </button>
                            <button
                              onClick={() => openEditModal(customer)}
                              className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                              title="Edit"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                              </svg>
                            </button>
                            {deleteConfirm === customer.customer_id ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => handleDelete(customer.customer_id)}
                                  className="px-2 py-1.5 rounded text-xs font-medium bg-red-100 text-red-600"
                                >
                                  Confirm
                                </button>
                                <button
                                  onClick={() => setDeleteConfirm(null)}
                                  className="px-2 py-1.5 rounded text-xs font-medium bg-slate-100 text-slate-600"
                                >
                                  Cancel
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setDeleteConfirm(customer.customer_id)}
                                className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                                title="Delete"
                              >
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

      <CustomerModal
        isOpen={isModalOpen}
        editingCustomer={editingCustomer}
        form={form}
        serviceOffices={serviceOffices.map((s) => ({
          service_office_id: s.service_office_id,
          service_office_name: s.service_office_name,
        }))}
        fixedServiceOfficeId={fixedServiceOfficeId}
        isSaving={isSaving}
        onClose={resetModal}
        onSave={handleSave}
        onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
      />

      <CustomerProjectsModal
        isOpen={projectsContext != null}
        context={projectsContext}
        onClose={() => setProjectsContext(null)}
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

export default function CustomersPage() {
  return (
    <SidebarProvider>
      <CustomersContent />
    </SidebarProvider>
  );
}
