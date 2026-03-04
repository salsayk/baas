"use client";

import { useCallback, useEffect, useState } from "react";
import { CustomerModal } from "@/database/customer/CustomerModal";
import { CustomerProjectsModal } from "@/database/project/CustomerProjectsModal";
import type { Customer, CreateCustomerInput } from "@/database/customer/types";

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

interface ServiceOfficeCustomersModalProps {
  isOpen: boolean;
  serviceOffice: { service_office_id: number; service_office_name: string } | null;
  onClose: () => void;
  onNotify: (message: string, type: "create" | "update" | "delete" | "error") => void;
}

export function ServiceOfficeCustomersModal({
  isOpen,
  serviceOffice,
  onClose,
  onNotify,
}: ServiceOfficeCustomersModalProps) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [projectsContext, setProjectsContext] = useState<{
    service_office_id: number;
    service_office_name: string;
    customer_id: number;
    customer_name: string;
  } | null>(null);
  const [form, setForm] = useState<CreateCustomerInput & { status: number }>(defaultForm);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCustomers = useCallback(async () => {
    if (!serviceOffice || !isOpen) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/customers?service_office_id=${serviceOffice.service_office_id}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setCustomers(Array.isArray(data) ? data : []);
    } catch {
      setCustomers([]);
      onNotify("Failed to load customers", "error");
    } finally {
      setIsLoading(false);
    }
  }, [serviceOffice?.service_office_id, isOpen, onNotify]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  const resetForm = () => {
    setIsFormOpen(false);
    setEditingCustomer(null);
    setForm({
      ...defaultForm,
      service_office_id: serviceOffice?.service_office_id ?? 0,
    });
  };

  const openAddForm = () => {
    setEditingCustomer(null);
    setForm({
      ...defaultForm,
      service_office_id: serviceOffice?.service_office_id ?? 0,
    });
    setIsFormOpen(true);
  };

  const openEditForm = (customer: Customer) => {
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
    setIsFormOpen(true);
  };

  const handleSave = async () => {
    if (!serviceOffice || !form.customer_name?.trim() || !form.email_address?.trim()) return;
    setIsSaving(true);
    try {
      if (editingCustomer) {
        const res = await fetch(`/api/customers/${editingCustomer.customer_id}`, {
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
        if (!res.ok) throw new Error("Failed to update");
        const updated = await res.json();
        setCustomers((prev) =>
          prev.map((c) => (c.customer_id === updated.customer_id ? updated : c))
        );
        onNotify(`"${updated.customer_name}" updated`, "update");
      } else {
        const res = await fetch("/api/customers", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            service_office_id: serviceOffice.service_office_id,
          }),
        });
        if (!res.ok) throw new Error("Failed to create");
        const created = await res.json();
        setCustomers((prev) => [created, ...prev]);
        onNotify(`"${created.customer_name}" created`, "create");
      }
      resetForm();
    } catch {
      onNotify("Operation failed", "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (customerId: number) => {
    try {
      const res = await fetch(`/api/customers/${customerId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      const customer = customers.find((c) => c.customer_id === customerId);
      setCustomers((prev) => prev.filter((c) => c.customer_id !== customerId));
      setDeleteConfirm(null);
      onNotify(`"${customer?.customer_name ?? "Customer"}" deleted`, "delete");
    } catch {
      onNotify("Delete failed", "error");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onClose}
          aria-hidden="true"
        />
        <div className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="p-4 lg:p-6 border-b border-slate-100 flex items-center justify-between flex-shrink-0">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Customers — {serviceOffice?.service_office_name ?? ""}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Manage customers for this service office
              </p>
              <div className="mt-3">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
                  Service Office
                </label>
                <select
                  value={serviceOffice?.service_office_id ?? ""}
                  disabled
                  className="w-full sm:w-[320px] px-3 py-2 rounded-lg border border-slate-200 bg-slate-100 text-slate-700"
                >
                  {serviceOffice ? (
                    <option value={serviceOffice.service_office_id}>
                      {serviceOffice.service_office_name}
                    </option>
                  ) : (
                    <option value="">Select service office</option>
                  )}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={openAddForm}
                disabled={!serviceOffice}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors disabled:opacity-50"
              >
                Add Customer
              </button>
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-100 text-slate-500 transition-colors"
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
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">Name</th>
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Mobile</th>
                  <th className="px-4 lg:px-6 py-3 text-start text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 lg:px-6 py-3 text-end text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 lg:px-6 py-12 text-center">
                      <div className="w-8 h-8 border-2 border-slate-200 border-t-violet-500 rounded-full animate-spin mx-auto mb-2" />
                      <p className="text-slate-500 text-sm">Loading...</p>
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 lg:px-6 py-12 text-center text-slate-500 text-sm">
                      No customers yet. Click "Add Customer" to create one.
                    </td>
                  </tr>
                ) : (
                  customers.map((customer) => (
                    <tr key={customer.customer_id} className="hover:bg-slate-50/50">
                      <td className="px-4 lg:px-6 py-3 font-medium text-slate-900">{customer.customer_name}</td>
                      <td className="px-4 lg:px-6 py-3 hidden sm:table-cell text-sm text-slate-600">{customer.email_address}</td>
                      <td className="px-4 lg:px-6 py-3 hidden md:table-cell text-sm text-slate-600">{customer.mobile_phone || "—"}</td>
                      <td className="px-4 lg:px-6 py-3">
                        <span className="inline-flex px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                          {STATUS_LABELS[customer.status] ?? "Unknown"}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              if (!serviceOffice) return;
                              setProjectsContext({
                                service_office_id: customer.service_office_id,
                                service_office_name: serviceOffice.service_office_name,
                                customer_id: customer.customer_id,
                                customer_name: customer.customer_name,
                              });
                            }}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            title="Manage projects"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M2 20h20"/>
                              <path d="M5 20V9l7-5 7 5v11"/>
                              <path d="M9 13h6"/>
                            </svg>
                          </button>
                          <button
                            onClick={() => openEditForm(customer)}
                            className="p-2 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
                            title="Edit"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
                            </svg>
                          </button>
                          {deleteConfirm === customer.customer_id ? (
                            <>
                              <button
                                onClick={() => handleDelete(customer.customer_id)}
                                className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-600 hover:bg-red-200"
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-600"
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(customer.customer_id)}
                              className="p-2 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-500"
                              title="Delete"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
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

      <CustomerModal
        isOpen={isFormOpen}
        editingCustomer={editingCustomer}
        form={form}
        serviceOffices={
          serviceOffice
            ? [{ service_office_id: serviceOffice.service_office_id, service_office_name: serviceOffice.service_office_name }]
            : []
        }
        fixedServiceOfficeId={serviceOffice?.service_office_id ?? null}
        isSaving={isSaving}
        onClose={resetForm}
        onSave={handleSave}
        onChange={(updates) => setForm((prev) => ({ ...prev, ...updates }))}
      />

      <CustomerProjectsModal
        isOpen={projectsContext != null}
        context={projectsContext}
        onClose={() => setProjectsContext(null)}
        onNotify={onNotify}
      />
    </>
  );
}
