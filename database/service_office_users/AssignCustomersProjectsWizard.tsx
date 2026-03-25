"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "@/app/context/TranslationContext";

interface Customer {
  customer_id: number;
  customer_name: string;
  email_address: string;
  address_city?: string | null;
  address_country?: string | null;
  [key: string]: unknown;
}

interface Project {
  project_id: number;
  project_name: string;
  customer_id: number;
  [key: string]: unknown;
}

interface Contract {
  contract_id: number;
  contract_name: string;
  customer_id: number;
  customer_name?: string;
  [key: string]: unknown;
}

interface EntityPair {
  parent_entity_id: number;
  child_entity_id: number;
}

interface AssignCustomersProjectsWizardProps {
  isOpen: boolean;
  serviceOfficeId: number;
  serviceOfficeUserId: number;
  userName: string;
  onClose: () => void;
  onSaved: () => void;
}

const CUSTOMER_ICONS = [
  "M19 21V5a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5m-4 0h4",
  "M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3",
  "M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z",
];

function getCustomerIcon(index: number) {
  return CUSTOMER_ICONS[index % CUSTOMER_ICONS.length];
}

function ToggleSwitch({
  checked,
  onChange,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      className={`relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 ${
        disabled ? "cursor-not-allowed opacity-95" : "cursor-pointer"
      } ${checked ? "bg-violet-600" : "bg-slate-200"} ${disabled && checked ? "ring-2 ring-violet-400 ring-offset-1" : ""}`}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

export function AssignCustomersProjectsWizard({
  isOpen,
  serviceOfficeId,
  serviceOfficeUserId,
  userName,
  onClose,
  onSaved,
}: AssignCustomersProjectsWizardProps) {
  const { t } = useTranslations();
  const [step, setStep] = useState(1);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [projectsByCustomer, setProjectsByCustomer] = useState<Record<number, Project[]>>({});
  const [allContractsByCustomer, setAllContractsByCustomer] = useState<Record<number, Contract[]>>({});
  const [projectContractPairs, setProjectContractPairs] = useState<EntityPair[]>([]);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(new Set());
  const [assignAllCurrentCustomers, setAssignAllCurrentCustomers] = useState(false);
  const [assignAllFutureCustomers, setAssignAllFutureCustomers] = useState(false);
  const [allFutureProjectsByCustomer, setAllFutureProjectsByCustomer] = useState<Set<number>>(new Set());
  const [selectedProjects, setSelectedProjects] = useState<Set<number>>(new Set());
  const [selectedIndependentContracts, setSelectedIndependentContracts] = useState<Set<number>>(new Set());
  const [expandedCustomers, setExpandedCustomers] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const loadIdRef = useRef(0);

  const effectiveSelectedCustomerIds: number[] = assignAllFutureCustomers
    ? customers.map((c) => c.customer_id)
    : Array.from(selectedCustomers);

  const fetchCustomers = useCallback(async () => {
    if (!serviceOfficeId || !isOpen) return;
    const myLoadId = loadIdRef.current;
    try {
      const res = await fetch(`/api/customers?service_office_id=${serviceOfficeId}`);
      if (!res.ok) throw new Error("Failed to fetch customers");
      const data = await res.json();
      const list = Array.isArray(data) ? data : [];
      if (myLoadId !== loadIdRef.current) return;
      setCustomers(list.map((c: Customer) => ({ ...c, customer_id: Number(c.customer_id) })));
    } catch (err) {
      if (myLoadId !== loadIdRef.current) return;
      setError(err instanceof Error ? err.message : "Failed to load");
      setCustomers([]);
    }
  }, [serviceOfficeId, isOpen]);

  const fetchExistingAuth = useCallback(async () => {
    if (!serviceOfficeUserId || !isOpen) return;
    const myLoadId = loadIdRef.current;
    try {
      const res = await fetch(`/api/user-data-authorization?service_office_user_id=${serviceOfficeUserId}`);
      if (!res.ok) {
        if (myLoadId !== loadIdRef.current) return;
        setAssignAllFutureCustomers(false);
        setSelectedCustomers(new Set());
        setAllFutureProjectsByCustomer(new Set());
        setSelectedProjects(new Set());
        setSelectedIndependentContracts(new Set());
        setExpandedCustomers(new Set());
        setAssignAllCurrentCustomers(false);
        return;
      }
      const data = await res.json();
      if (myLoadId !== loadIdRef.current) return;
      const rows = Array.isArray(data) ? data : [];
      const loadedCustomers: number[] = [];
      const loadedProjects: number[] = [];
      const loadedContracts: number[] = [];
      let loadedAssignAllFutureCustomers = false;
      const loadedAllFutureProjectsCustomers: number[] = [];

      const soId = Number(serviceOfficeId);
      rows.forEach((r: Record<string, unknown>) => {
        const type = Number(r.authorized_entity_type ?? r.authorizedEntityType ?? 0);
        const entityId = Number(r.entity_id ?? r.entityId ?? 0);
        if (type === 2) loadedCustomers.push(entityId);
        else if (type === 3) loadedProjects.push(entityId);
        else if (type === 4) loadedContracts.push(entityId);
        else if (type === 100 && entityId === soId) loadedAssignAllFutureCustomers = true;
        else if (type === 101) loadedAllFutureProjectsCustomers.push(entityId);
      });

      let independentContractsToSelect = loadedContracts;
      if (loadedProjects.length > 0) {
        const pairsRes = await fetch(`/api/entities-pairs?parent_entity_ids=${loadedProjects.join(",")}&entities_pair_type=0`);
        if (pairsRes.ok) {
          const pairsData = await pairsRes.json();
          const projectLinkedIds = new Set(
            (Array.isArray(pairsData) ? pairsData : []).map((p: { child_entity_id: number }) => Number(p.child_entity_id))
          );
          independentContractsToSelect = loadedContracts.filter((id) => !projectLinkedIds.has(id));
        }
      }

      setAssignAllFutureCustomers(loadedAssignAllFutureCustomers);
      if (loadedAssignAllFutureCustomers) {
        setSelectedCustomers(new Set());
        setAllFutureProjectsByCustomer(new Set());
      } else {
        setSelectedCustomers(new Set(loadedCustomers));
        setAllFutureProjectsByCustomer(new Set(loadedAllFutureProjectsCustomers));
      }
      setSelectedProjects(new Set(loadedProjects));

      if (loadedAssignAllFutureCustomers && loadedCustomers.length > 0) {
        setAssignAllCurrentCustomers(true);
      }

      if (loadedProjects.length > 0 || loadedCustomers.length > 0) {
        setExpandedCustomers(new Set(loadedAssignAllFutureCustomers ? [] : loadedCustomers));
      }

      setSelectedIndependentContracts(new Set(independentContractsToSelect));
    } catch {
      // Ignore
    }
  }, [serviceOfficeUserId, serviceOfficeId, isOpen]);

  const fetchProjectsForCustomers = useCallback(async (customerIds: number[]) => {
    if (customerIds.length === 0) return;
    const byCustomer: Record<number, Project[]> = {};
    await Promise.all(
      customerIds.map(async (cid) => {
        const res = await fetch(`/api/projects?service_office_id=${serviceOfficeId}&customer_id=${cid}`);
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        byCustomer[cid] = list.map((p: Project) => ({ ...p, project_id: Number(p.project_id), customer_id: Number(p.customer_id ?? cid) }));
      })
    );
    setProjectsByCustomer((prev) => ({ ...prev, ...byCustomer }));
  }, [serviceOfficeId]);

  const fetchContractsAndPairs = useCallback(async (customerIds: number[], projectIds: number[]) => {
    const byCustomer: Record<number, Contract[]> = {};
    await Promise.all(
      customerIds.map(async (cid) => {
        const res = await fetch(`/api/contracts?service_office_id=${serviceOfficeId}&customer_id=${cid}`);
        if (!res.ok) return;
        const data = await res.json();
        const list = Array.isArray(data) ? data : [];
        byCustomer[cid] = list.map((c: Contract) => ({
          ...c,
          contract_id: Number(c.contract_id),
          customer_id: Number(c.customer_id ?? cid),
        }));
      })
    );
    setAllContractsByCustomer((prev) => ({ ...prev, ...byCustomer }));

    if (projectIds.length > 0) {
      const res = await fetch(`/api/entities-pairs?parent_entity_ids=${projectIds.join(",")}&entities_pair_type=0`);
      if (res.ok) {
        const data = await res.json();
        const pairs = Array.isArray(data) ? data : [];
        setProjectContractPairs(
          pairs.map((p: EntityPair) => ({
            parent_entity_id: Number(p.parent_entity_id),
            child_entity_id: Number(p.child_entity_id),
          }))
        );
      } else {
        setProjectContractPairs([]);
      }
    } else {
      setProjectContractPairs([]);
    }
  }, [serviceOfficeId]);

  useEffect(() => {
    if (isOpen && serviceOfficeId && serviceOfficeUserId) {
      loadIdRef.current += 1;
      setError(null);
      setStep(1);
      setSelectedCustomers(new Set());
      setAssignAllCurrentCustomers(false);
      setAssignAllFutureCustomers(false);
      setAllFutureProjectsByCustomer(new Set());
      setSelectedProjects(new Set());
      setSelectedIndependentContracts(new Set());
      setExpandedCustomers(new Set());
      setProjectsByCustomer({});
      setAllContractsByCustomer({});
      setProjectContractPairs([]);
      fetchCustomers();
      fetchExistingAuth();
    }
  }, [isOpen, serviceOfficeId, serviceOfficeUserId, fetchCustomers, fetchExistingAuth]);

  const handleAssignAllCurrentCustomers = () => {
    if (assignAllFutureCustomers) return;
    const next = !assignAllCurrentCustomers;
    setAssignAllCurrentCustomers(next);
    setSelectedCustomers(next ? new Set(customers.map((c) => c.customer_id)) : new Set());
  };

  useEffect(() => {
    if (assignAllFutureCustomers && customers.length > 0) {
      const allCustomerIds = customers.map((c) => c.customer_id);
      setAssignAllCurrentCustomers(true);
      setSelectedCustomers(new Set(allCustomerIds));
      setAllFutureProjectsByCustomer(new Set(allCustomerIds));
    }
  }, [assignAllFutureCustomers, customers]);

  useEffect(() => {
    if (step >= 2) {
      const ids = assignAllFutureCustomers ? customers.map((c) => c.customer_id) : Array.from(selectedCustomers);
      if (ids.length === 0) return;
      setExpandedCustomers(new Set(ids));
      fetchProjectsForCustomers(ids);
    }
  }, [step, assignAllFutureCustomers, customers, selectedCustomers, fetchProjectsForCustomers]);

  useEffect(() => {
    if (!assignAllFutureCustomers) return;
    const allProjectIds: number[] = [];
    Object.values(projectsByCustomer).forEach((projs) => {
      projs.forEach((p) => allProjectIds.push(p.project_id));
    });
    if (allProjectIds.length === 0) return;
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      allProjectIds.forEach((id) => next.add(id));
      return next;
    });
  }, [assignAllFutureCustomers, projectsByCustomer]);

  useEffect(() => {
    const toAdd: number[] = [];
    allFutureProjectsByCustomer.forEach((cid) => {
      (projectsByCustomer[cid] ?? []).forEach((p) => toAdd.push(p.project_id));
    });
    if (toAdd.length > 0) {
      setSelectedProjects((prev) => {
        const next = new Set(prev);
        toAdd.forEach((id) => next.add(id));
        return next.size > prev.size ? next : prev;
      });
    }
  }, [allFutureProjectsByCustomer, projectsByCustomer]);

  useEffect(() => {
    if (step >= 3) {
      const custIds = assignAllFutureCustomers ? customers.map((c) => c.customer_id) : Array.from(selectedCustomers);
      if (custIds.length === 0) return;
      const projIds = Array.from(selectedProjects);
      fetchContractsAndPairs(custIds, projIds);
    }
  }, [step, assignAllFutureCustomers, customers, selectedCustomers, selectedProjects, fetchContractsAndPairs]);

  const toggleCustomer = (customerId: number) => {
    if (assignAllFutureCustomers) return;
    setSelectedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };

  const toggleProject = (projectId: number, customerId: number) => {
    if (allFutureProjectsByCustomer.has(customerId)) return;
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) next.delete(projectId);
      else next.add(projectId);
      return next;
    });
  };

  const toggleAllFutureProjectsByCustomer = (customerId: number) => {
    setAllFutureProjectsByCustomer((prev) => {
      const next = new Set(prev);
      const projects = projectsByCustomer[customerId] ?? [];
      if (next.has(customerId)) {
        next.delete(customerId);
        setSelectedProjects((p) => {
          const n = new Set(p);
          projects.forEach((pr) => n.delete(pr.project_id));
          return n;
        });
      } else {
        next.add(customerId);
        setSelectedProjects((p) => {
          const n = new Set(p);
          projects.forEach((pr) => n.add(pr.project_id));
          return n;
        });
      }
      return next;
    });
  };

  const toggleIndependentContract = (contractId: number) => {
    setSelectedIndependentContracts((prev) => {
      const next = new Set(prev);
      if (next.has(contractId)) next.delete(contractId);
      else next.add(contractId);
      return next;
    });
  };

  const toggleExpandCustomer = (customerId: number) => {
    setExpandedCustomers((prev) => {
      const next = new Set(prev);
      if (next.has(customerId)) next.delete(customerId);
      else next.add(customerId);
      return next;
    });
  };

  const projectLinkedContractIds = new Set(projectContractPairs.map((p) => p.child_entity_id));

  const independentContracts: Array<{ contract: Contract; customer: Customer }> = [];
  effectiveSelectedCustomerIds.forEach((cid) => {
    const cust = customers.find((c) => Number(c.customer_id) === Number(cid));
    if (!cust) return;
    const contracts = allContractsByCustomer[cid] ?? [];
    contracts.forEach((contract) => {
      if (!projectLinkedContractIds.has(contract.contract_id)) {
        independentContracts.push({ contract, customer: cust });
      }
    });
  });

  const getContractById = (contractId: number): Contract | null => {
    const id = Number(contractId);
    for (const arr of Object.values(allContractsByCustomer)) {
      const c = arr.find((x) => Number(x.contract_id) === id);
      if (c) return c;
    }
    return null;
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    try {
      // When "assign all future customers" is ON, save only type 100 (no specific customer records)
      const customersToSave = assignAllFutureCustomers ? [] : Array.from(selectedCustomers);
      // When "all future projects" is ON for a customer, save only type 101 for that customer (no specific project records for that customer)
      const projectToCustomer = new Map<number, number>();
      Object.entries(projectsByCustomer).forEach(([cid, projs]) => {
        const customerId = Number(cid);
        projs.forEach((p) => projectToCustomer.set(p.project_id, customerId));
      });
      const projectsToSave = Array.from(selectedProjects).filter((projectId) => {
        const customerId = projectToCustomer.get(projectId);
        return customerId != null && !allFutureProjectsByCustomer.has(customerId);
      });
      // Only save independent contract IDs (contracts not linked to projects); project-linked contracts are implied by project access
      const res = await fetch("/api/user-data-authorization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          service_office_user_id: serviceOfficeUserId,
          service_office_id: serviceOfficeId,
          customers: customersToSave,
          projects: projectsToSave,
          contracts: Array.from(selectedIndependentContracts),
          assign_all_future_customers: assignAllFutureCustomers,
          all_future_projects_customer_ids: Array.from(allFutureProjectsByCustomer),
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to save");
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: "rgba(0,0,0,0.4)" }}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200">
        <div className="flex-shrink-0 px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{t("Assign Customers & Projects")}</h2>
              <p className="mt-1 text-sm text-slate-600">Assign data access for {userName}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="p-2 rounded-lg hover:bg-slate-200 text-slate-600"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>
          </div>
          <div className="mt-3 flex gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${
                  s <= step ? "bg-violet-600" : "bg-slate-200"
                }`}
              />
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-auto p-6">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
              {error}
            </div>
          )}

          {step === 1 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Customers</h3>
              {customers.length === 0 ? (
                <p className="py-12 text-center text-slate-500">No customers for this service office</p>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-4 mb-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                    <label className={`flex items-center gap-2 ${assignAllFutureCustomers ? "cursor-not-allowed opacity-95" : "cursor-pointer"}`}>
                      <input
                        type="checkbox"
                        checked={assignAllCurrentCustomers}
                        disabled={assignAllFutureCustomers}
                        onChange={handleAssignAllCurrentCustomers}
                        className="rounded border-slate-300 text-violet-600 focus:ring-violet-500 disabled:opacity-90 disabled:accent-violet-600"
                      />
                      <span className="text-sm font-medium text-slate-700">Assign all current customers</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer flex-shrink-0">
                      <span className="text-sm font-medium text-slate-700">Assign all future customers automatically</span>
                      <ToggleSwitch
                        checked={assignAllFutureCustomers}
                        onChange={setAssignAllFutureCustomers}
                      />
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {customers.map((c, idx) => (
                    <label
                      key={c.customer_id}
                      className={`flex flex-col p-4 rounded-xl border-2 transition-all ${
                        assignAllFutureCustomers ? "cursor-not-allowed opacity-95" : "cursor-pointer"
                      } ${
                        assignAllFutureCustomers
                          ? "border-amber-600 bg-amber-50 shadow-md ring-1 ring-amber-400/50"
                          : selectedCustomers.has(c.customer_id)
                            ? "border-amber-700 bg-amber-50 shadow-md"
                            : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <svg
                          className={`flex-shrink-0 w-10 h-10 ${
                            assignAllFutureCustomers || selectedCustomers.has(c.customer_id) ? "text-amber-700" : "text-slate-400"
                          }`}
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={getCustomerIcon(idx)} />
                        </svg>
                        <input
                          type="checkbox"
                          checked={selectedCustomers.has(c.customer_id)}
                          disabled={assignAllFutureCustomers}
                          onChange={() => toggleCustomer(c.customer_id)}
                          className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 mt-0.5 disabled:opacity-90 disabled:accent-amber-600"
                        />
                      </div>
                      <span className="mt-3 font-semibold text-slate-900 block">{c.customer_name}</span>
                      <span className="mt-1 text-sm text-slate-600 line-clamp-2">
                        {[c.address_city, c.address_country].filter(Boolean).join(", ") || c.email_address || "—"}
                      </span>
                    </label>
                  ))}
                </div>
                </>
              )}
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Customers & Projects</h3>
              {effectiveSelectedCustomerIds.length === 0 ? (
                <p className="py-12 text-center text-slate-500">Select customers in Step 1 first</p>
              ) : (
                <div className="space-y-2">
                  {effectiveSelectedCustomerIds.map((cid) => {
                    const cust = customers.find((c) => Number(c.customer_id) === Number(cid));
                    const projects = projectsByCustomer[cid] ?? [];
                    const isExpanded = expandedCustomers.has(cid);
                    const allFutureForCustomer = allFutureProjectsByCustomer.has(cid);
                    const allSelected =
                      allFutureForCustomer || (projects.length > 0 && projects.every((p) => selectedProjects.has(p.project_id)));
                    const tab2Disabled = assignAllFutureCustomers;
                    return (
                      <div key={cid} className={`border border-slate-200 rounded-lg overflow-hidden ${tab2Disabled ? "opacity-95" : ""}`}>
                        <div className="flex items-center gap-3 px-4 py-3 bg-slate-50 hover:bg-slate-100">
                          <button
                            type="button"
                            onClick={() => toggleExpandCustomer(cid)}
                            className="flex-1 flex items-center gap-3 text-left min-w-0"
                          >
                            <input
                              type="checkbox"
                              checked={allSelected}
                              disabled={tab2Disabled || allFutureForCustomer}
                              onChange={(e) => {
                                e.stopPropagation();
                                if (tab2Disabled || allFutureForCustomer) return;
                                if (e.target.checked) {
                                  projects.forEach((p) => setSelectedProjects((prev) => new Set([...prev, p.project_id])));
                                } else {
                                  projects.forEach((p) =>
                                    setSelectedProjects((prev) => {
                                      const next = new Set(prev);
                                      next.delete(p.project_id);
                                      return next;
                                    })
                                  );
                                }
                              }}
                              onClick={(e) => e.stopPropagation()}
                              className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 flex-shrink-0 disabled:opacity-90 disabled:accent-amber-600"
                            />
                            <span className="font-medium text-slate-900 truncate">
                              {cust?.customer_name ?? `Customer ${cid}`}
                            </span>
                            <svg
                              className={`w-5 h-5 text-slate-500 transition-transform flex-shrink-0 ${isExpanded ? "rotate-180" : ""}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          <div
                            className={`flex items-center gap-2 flex-shrink-0 ms-auto ${tab2Disabled ? "cursor-not-allowed opacity-95" : ""}`}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="text-sm text-slate-600 hidden sm:inline">Assign all future projects</span>
                            <ToggleSwitch
                              checked={tab2Disabled || allFutureForCustomer}
                              onChange={() => toggleAllFutureProjectsByCustomer(cid)}
                              disabled={tab2Disabled}
                            />
                          </div>
                        </div>
                        {isExpanded && (
                          <div className="border-t border-slate-200 bg-white divide-y divide-slate-100">
                            {projects.length === 0 ? (
                              <div className="px-4 py-3 text-sm text-slate-500">No projects</div>
                            ) : (
                              projects.map((p) => (
                                <label
                                  key={p.project_id}
                                  className={`flex items-center gap-3 px-4 py-2.5 pl-12 ${tab2Disabled || allFutureForCustomer ? "cursor-not-allowed opacity-95" : "cursor-pointer hover:bg-slate-50"} ${selectedProjects.has(p.project_id) && (tab2Disabled || allFutureForCustomer) ? "bg-amber-50/80" : ""}`}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedProjects.has(p.project_id)}
                                    disabled={tab2Disabled || allFutureForCustomer}
                                    onChange={() => toggleProject(p.project_id, cid)}
                                    className="rounded border-slate-300 text-amber-600 focus:ring-amber-500 disabled:opacity-90 disabled:accent-amber-600"
                                  />
                                  <span className="text-sm text-slate-700">{p.project_name}</span>
                                </label>
                              ))
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Contracts</h3>
              <div className="space-y-6">
                {effectiveSelectedCustomerIds.some((cid) => {
                  const projs = projectsByCustomer[cid] ?? [];
                  const toShow = assignAllFutureCustomers ? projs : projs.filter((p) => selectedProjects.has(p.project_id));
                  return toShow.length > 0;
                }) && (
                  <div>
                    <h4 className="font-semibold text-slate-800 mb-2">Project-Linked Contracts</h4>
                    <div className="space-y-3">
                      {effectiveSelectedCustomerIds.map((cid) => {
                        const cust = customers.find((c) => Number(c.customer_id) === Number(cid));
                        const projs = (projectsByCustomer[cid] ?? []).filter((p) =>
                          assignAllFutureCustomers ? true : selectedProjects.has(p.project_id)
                        );
                        if (projs.length === 0) return null;
                        return (
                          <div key={cid} className="border border-slate-200 rounded-lg overflow-hidden">
                            <div className="px-4 py-2.5 bg-slate-100 font-medium text-slate-800">
                              {cust?.customer_name ?? `Customer ${cid}`}
                            </div>
                            <div className="divide-y divide-slate-100">
                              {projs.map((p) => {
                                const pairContractIds = projectContractPairs
                                  .filter((pair) => pair.parent_entity_id === p.project_id)
                                  .map((pair) => pair.child_entity_id);
                                return (
                                  <div key={p.project_id} className="bg-emerald-50/50 border-b border-emerald-100 last:border-0">
                                    <div className="px-4 py-2 flex items-center gap-2">
                                      <input type="checkbox" checked disabled className="rounded border-slate-300 text-emerald-600" />
                                      <span className="font-medium text-slate-800">{p.project_name}</span>
                                    </div>
                                    <div className="pl-12 pr-4 pb-2 space-y-1">
                                      {pairContractIds.map((contractId) => {
                                        const contract = getContractById(contractId);
                                        return (
                                          <div key={contractId} className="flex items-center gap-2 py-1">
                                            <input type="checkbox" checked disabled className="rounded border-slate-300 text-emerald-600" />
                                            <span className="text-sm text-slate-700">
                                              {contract?.contract_name ?? `Contract ${contractId}`}
                                            </span>
                                          </div>
                                        );
                                      })}
                                      {pairContractIds.length === 0 && (
                                        <div className="text-sm text-slate-500 py-1">No contracts linked</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <h4 className="font-semibold text-slate-800 mb-2">Independent Customer Contracts</h4>
                  <p className="text-sm text-slate-600 mb-2">
                    Contracts not linked to any project. Select which to assign.
                  </p>
                  <div className="border border-slate-200 rounded-lg divide-y divide-slate-100">
                    {independentContracts.length === 0 ? (
                      <div className="px-4 py-4 text-sm text-slate-500">No independent contracts</div>
                    ) : (
                      independentContracts.map(({ contract, customer }) => (
                        <label
                          key={contract.contract_id}
                          className="flex items-center gap-3 px-4 py-3 hover:bg-slate-50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedIndependentContracts.has(contract.contract_id)}
                            onChange={() => toggleIndependentContract(contract.contract_id)}
                            className="rounded border-slate-300 text-amber-600 focus:ring-amber-500"
                          />
                          <span className="text-sm text-slate-700">
                            {customer.customer_name} → {contract.contract_name}
                          </span>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex-shrink-0 px-6 py-4 border-t border-slate-200 bg-slate-50 flex justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t("Back")}
          </button>
          {(() => {
            const isLastStep = step >= 3;
            const primaryLabel = isLastStep
              ? isSaving
                ? t("Saving...")
                : t("Save")
              : t("Next");
            return (
              <button
                key={isLastStep ? "save" : "next"}
                type="button"
                onClick={isLastStep ? handleSave : () => setStep((s) => s + 1)}
                disabled={
                  isLastStep
                    ? isSaving
                    : (step === 1 && selectedCustomers.size === 0 && !assignAllFutureCustomers) ||
                      (step === 2 &&
                        !assignAllFutureCustomers &&
                        (() => {
                          const totalProjects = Array.from(selectedCustomers).reduce(
                            (sum, cid) => sum + (projectsByCustomer[cid]?.length ?? 0),
                            0
                          );
                          return totalProjects > 0 && selectedProjects.size === 0;
                        })())
                }
                className="px-4 py-2 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {primaryLabel}
              </button>
            );
          })()}
        </div>
      </div>
    </div>
  );
}
