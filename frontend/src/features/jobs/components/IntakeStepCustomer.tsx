"use client";

import React, { useState } from "react";
import { useTranslations } from "next-intl";
import { Search, UserCheck, Plus, Phone, User as UserIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCustomers, type Customer } from "@/features/customers/api";
import { useIntakeStore } from "../intake-store";

interface IntakeStepCustomerProps {
  errors?: Record<string, string>;
  onNext?: () => void;
}

export function IntakeStepCustomer({ errors, onNext }: IntakeStepCustomerProps) {
  const t = useTranslations("intake");
  const draft = useIntakeStore((s) => s.draft);
  const updateCustomer = useIntakeStore((s) => s.updateCustomer);
  const phoneInputRef = React.useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState<"search" | "new">(() =>
    draft.customer.id ? "search" : draft.customer.name ? "new" : "search"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const { data: customerData, isPending: isSearching } = useCustomers(searchQuery);

  const customers = customerData?.pages.flatMap((p) => p.items) ?? [];

  const handleSelectExisting = (cust: Customer) => {
    updateCustomer({
      id: cust.id,
      name: cust.name,
      phone: cust.phone || "",
    });
    setSearchQuery("");
  };

  const handleClearSelection = () => {
    updateCustomer({ id: undefined, name: "", phone: "" });
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
          {t("stepCustomerTitle")}
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          {t("stepCustomerSubtitle")}
        </p>
      </div>

      {/* Selected Customer Card */}
      {draft.customer.id ? (
        <div className="p-4 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-sky-100 dark:bg-sky-900/60 flex items-center justify-center text-sky-600 dark:text-sky-400">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                {draft.customer.name}
              </p>
              <p className="text-xs text-neutral-500 font-mono">
                {draft.customer.phone}
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleClearSelection}
            className="h-8 text-xs font-medium"
          >
            {t("changeCustomer")}
          </Button>
        </div>
      ) : (
        <>
          {/* Mode Switcher */}
          <div className="grid grid-cols-2 p-1 bg-neutral-100 dark:bg-neutral-800 rounded-xl gap-1">
            <button
              type="button"
              onClick={() => setMode("search")}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === "search"
                  ? "bg-white dark:bg-neutral-900 text-neutral-950 dark:text-neutral-50 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {t("searchExistingCustomer")}
            </button>
            <button
              type="button"
              onClick={() => setMode("new")}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                mode === "new"
                  ? "bg-white dark:bg-neutral-900 text-neutral-950 dark:text-neutral-50 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {t("addNewCustomer")}
            </button>
          </div>

          {mode === "search" ? (
            <div className="space-y-3">
              <div className="relative">
                <Search className="w-4 h-4 text-neutral-400 absolute left-3.5 top-3.5" />
                <Input
                  type="text"
                  placeholder={t("searchCustomerPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-11 text-sm rounded-xl"
                />
              </div>

              {/* Search Results */}
              {isSearching && searchQuery.length >= 2 && (
                <p className="text-xs text-neutral-400 py-2 text-center">
                  {t("searching")}
                </p>
              )}

              {customers.length > 0 ? (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800 border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden max-h-60 overflow-y-auto">
                  {customers.map((cust) => (
                    <button
                      key={cust.id}
                      type="button"
                      onClick={() => handleSelectExisting(cust)}
                      className="w-full px-4 py-3 text-left flex items-center justify-between hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
                    >
                      <div>
                        <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                          {cust.name}
                        </p>
                        <p className="text-xs text-neutral-500 font-mono">
                          {cust.phone}
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-neutral-400" />
                    </button>
                  ))}
                </div>
              ) : searchQuery.length >= 2 && !isSearching ? (
                <div className="text-center py-4 px-2 bg-neutral-50 dark:bg-neutral-900/50 rounded-2xl border border-dashed border-neutral-200 dark:border-neutral-800">
                  <p className="text-xs text-neutral-500">{t("noCustomerFound")}</p>
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={() => {
                      setMode("new");
                      if (/^\d+$/.test(searchQuery.replace(/\D/g, ""))) {
                        updateCustomer({ phone: searchQuery });
                      } else {
                        updateCustomer({ name: searchQuery });
                      }
                    }}
                    className="text-xs text-sky-600 mt-1"
                  >
                    + {t("createNewWithThis")}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  {t("customerName")} *
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
                  <Input
                    type="text"
                    placeholder={t("customerNamePlaceholder")}
                    value={draft.customer.name}
                    onChange={(e) => updateCustomer({ name: e.target.value })}
                    enterKeyHint="next"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        phoneInputRef.current?.focus();
                      }
                    }}
                    className={`pl-9 h-11 text-sm rounded-xl ${
                      errors?.name ? "border-red-500" : ""
                    }`}
                  />
                </div>
                {errors?.name && (
                  <p className="text-xs text-red-500 font-medium mt-1">
                    {errors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1">
                  {t("customerPhone")} *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-neutral-400 absolute left-3 top-3.5" />
                  <Input
                    ref={phoneInputRef}
                    type="tel"
                    inputMode="tel"
                    placeholder="9876543210"
                    value={draft.customer.phone}
                    onChange={(e) => updateCustomer({ phone: e.target.value })}
                    enterKeyHint="go"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        onNext?.();
                      }
                    }}
                    className={`pl-9 h-11 text-sm font-mono rounded-xl ${
                      errors?.phone ? "border-red-500" : ""
                    }`}
                  />
                </div>
                {errors?.phone && (
                  <p className="text-xs text-red-500 font-medium mt-1">
                    {errors.phone}
                  </p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
