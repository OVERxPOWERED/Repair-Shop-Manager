"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Scale, ShieldAlert, FileText, CheckCircle2 } from "lucide-react";

export default function TermsOfServicePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-neutral-50 pb-20">
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-neutral-200/80 px-4 py-3.5">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => router.back()}
              className="w-9 h-9 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-600 hover:bg-neutral-200 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-base font-bold text-neutral-900">Terms of Service</h1>
              <p className="text-xs text-neutral-500">सेवा की शर्तें • Indian Law</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
            Oct 2026
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Scale className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              FixPro Terms of Service / सेवा की शर्तें
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Governing use of FixPro across Android, iOS and Web platforms.
            </p>
          </div>

          <div className="text-xs text-neutral-600 space-y-4 leading-relaxed pt-2 border-t border-neutral-100">
            <section className="space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                1. Platform Usage
              </h3>
              <p>
                FixPro provides workshop management software including digital repair sheets, billing, inventory, and automated customer updates. By registering an account, you agree to these Terms.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-600" />
                2. Anti-Theft & Lawful Electronics Handling
              </h3>
              <p>
                Repair workshops using FixPro must comply with all applicable telecommunications and cyber laws in India:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-neutral-600">
                <li>Workshops agree never to service devices reported stolen or blacklisted via the Government of India CEIR / Sanchar Saathi portal.</li>
                <li>Workshops must verify IMEI/serial numbers during intake and maintain accurate records as required by local authorities.</li>
                <li>FixPro reserves the right to suspend or terminate accounts involved in illegal tampering or unauthorized IMEI manipulation.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                3. Billing & Tax Invoicing
              </h3>
              <p>
                FixPro provides billing templates for regular bills, bills of supply, and GST tax invoices. Shop owners are solely responsible for setting appropriate GST tax rates, HSN codes, and remitting collected taxes to the tax authorities.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-900">
                4. Account Cancellation & Termination
              </h3>
              <p>
                You may request account deletion at any time. When deletion is requested, active sessions are invalidated and a 7-day grace period is provided. Once finalized, personal details are anonymized permanently.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-900">5. Jurisdiction</h3>
              <p>
                These Terms are governed by and construed in accordance with the laws of India. Any legal dispute shall be subject to the exclusive jurisdiction of the competent courts in India.
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
