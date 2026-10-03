"use client";

import React, { useState, useDeferredValue } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Users, Search, Plus, Phone, Calendar, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ListSkeleton } from "@/components/states/ListSkeleton";
import { EmptyState } from "@/components/states/EmptyState";
import { ErrorState } from "@/components/states/ErrorState";
import { CustomerFormSheet } from "@/features/customers/CustomerFormSheet";
import { useCustomers, type Customer } from "@/features/customers/api";
import { formatDate } from "@/lib/format/date";
import { useLocaleStore } from "@/i18n/store";

export default function CustomersPage() {
  const t = useTranslations("customers");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const locale = useLocaleStore((s) => s.locale);

  const [searchQuery, setSearchQuery] = useState("");
  const deferredSearch = useDeferredValue(searchQuery);
  const [filter, setFilter] = useState<"all" | "dues">("all");
  const [isFormOpen, setIsFormOpen] = useState(false);

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useCustomers(deferredSearch);

  const allCustomers = data?.pages.flatMap((p) => p.items) ?? [];

  const handleRowClick = (customer: Customer) => {
    router.push(`/customers/detail/?id=${customer.id}`);
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return (name[0] || "?").toUpperCase();
  };

  return (
    <div className="flex-1 flex flex-col min-h-full pb-24">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b px-4 pt-4 pb-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold tracking-tight">{t("customersTitle")}</h1>
          <Button
            size="sm"
            onClick={() => setIsFormOpen(true)}
            className="h-9 gap-1.5 rounded-xl text-xs font-semibold px-3 shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>{t("newCustomerBtn")}</span>
          </Button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t("searchPlaceholder")}
            className="pl-9 h-10 rounded-xl text-sm bg-muted/40 border-muted focus-visible:bg-background"
          />
        </div>

        {/* Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
              filter === "all"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {t("filterAll")}
          </button>
        </div>
      </div>

      {/* Main Content States */}
      <div className="flex-1 px-4 py-3">
        {isLoading ? (
          <ListSkeleton rows={6} />
        ) : isError ? (
          <ErrorState error={error} onRetry={refetch} />
        ) : allCustomers.length === 0 ? (
          <div className="py-12">
            <EmptyState
              icon={Users}
              title={searchQuery ? t("noSearchResultsTitle") : t("emptyTitle")}
              body={searchQuery ? t("noSearchResultsBody") : t("emptyBody")}
              action={
                searchQuery ? undefined : (
                  <Button onClick={() => setIsFormOpen(true)} className="rounded-xl">
                    <Plus className="h-4 w-4 mr-1.5" />
                    {t("newCustomerBtn")}
                  </Button>
                )
              }
            />
          </div>
        ) : (
          <div className="space-y-2">
            {allCustomers.map((c) => {
              const initials = getInitials(c.name);
              return (
                <div
                  key={c.id}
                  onClick={() => handleRowClick(c)}
                  className="flex items-center justify-between p-3.5 rounded-2xl border bg-card hover:bg-muted/40 active:scale-[0.99] transition-all cursor-pointer shadow-sm"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Monogram Avatar */}
                    <div className="h-11 w-11 shrink-0 rounded-2xl bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <p className="font-semibold text-sm truncate text-foreground">{c.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground mt-0.5">
                        {c.phone ? (
                          <span className="flex items-center gap-1 font-mono">
                            <Phone className="h-3 w-3" />
                            {c.phone}
                          </span>
                        ) : (
                          <span className="italic">{t("noPhone")}</span>
                        )}
                        {c.last_job_at && (
                          <>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {formatDate(c.last_job_at, locale)}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 ml-2" />
                </div>
              );
            })}

            {/* Pagination / Load More */}
            {hasNextPage && (
              <div className="pt-3 text-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="rounded-xl h-9 text-xs"
                >
                  {isFetchingNextPage ? tCommon("loading") : t("loadMoreBtn")}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FAB (Floating Action Button) */}
      <button
        type="button"
        onClick={() => setIsFormOpen(true)}
        className="fixed bottom-20 right-4 z-20 h-13 w-13 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label={t("newCustomerBtn")}
      >
        <Plus className="h-6 w-6" />
      </button>

      {/* Customer Form Sheet */}
      <CustomerFormSheet
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSaved={(created) => router.push(`/customers/detail/?id=${created.id}`)}
      />
    </div>
  );
}
