"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Shield, CheckCircle2, Lock, FileText, Database } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function PrivacyPolicyPage() {
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
              <h1 className="text-base font-bold text-neutral-900">Privacy Policy</h1>
              <p className="text-xs text-neutral-500">गोपनीयता नीति • DPDP Act 2023</p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-neutral-400 bg-neutral-100 px-2 py-1 rounded-full">
            Oct 2026
          </span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6">
        <div className="bg-white rounded-3xl border border-neutral-200/80 p-6 shadow-sm space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-neutral-900">
              FixPro Data Protection & Privacy Policy
            </h2>
            <p className="text-xs text-neutral-500 mt-1">
              Compliant with the Digital Personal Data Protection Act 2023 (DPDP Act) of India.
            </p>
          </div>

          <div className="text-xs text-neutral-600 space-y-4 leading-relaxed pt-2 border-t border-neutral-100">
            <section className="space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <Database className="w-4 h-4 text-blue-600" />
                1. Data We Collect
              </h3>
              <p>
                FixPro collects and processes information strictly necessary to operate a multi-tenant repair shop management service:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-neutral-600">
                <li><strong>Account Data:</strong> Technician/shop owner phone number (E.164 format) and display name.</li>
                <li><strong>Customer Repair Records:</strong> Customer phone number, name, device model, serial number/IMEI, and intake diagnosis.</li>
                <li><strong>Tax & Invoicing Data:</strong> Shop GSTIN, trade address, invoice line items, and payment receipts.</li>
                <li><strong>Device & Session Tokens:</strong> IP address, device platform, and app version for multi-device security and push alerts.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <Lock className="w-4 h-4 text-emerald-600" />
                2. Data Isolation & Multi-Tenancy
              </h3>
              <p>
                FixPro guarantees strict multi-tenant database isolation. Customer contact details, repair tickets, and financial ledgers belonging to one repair shop are inaccessible to any other shop or user.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-600" />
                3. Financial & Legal Retention Requirements
              </h3>
              <p>
                Under Section 36 of the Central Goods and Services Tax (CGST) Act, 2017, registered businesses must retain accounts and records, including issued invoices and credit notes, for a statutory period (typically 72 months from the annual return due date).
              </p>
              <p>
                Consequently, while account deletion completely removes technician phone numbers and PII, historical invoices and financial ledger entries remain preserved in read-only format for tax compliance.
              </p>
            </section>

            <section className="space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-900 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-blue-600" />
                4. Your Rights: Deletion & Anonymization
              </h3>
              <p>
                In accordance with the DPDP Act 2023, you have the right to request erasure and correction of personal data:
              </p>
              <ul className="list-disc list-inside space-y-1 pl-2 text-neutral-600">
                <li>You can submit an account deletion request directly in the app or at <code className="bg-neutral-100 px-1 py-0.5 rounded text-neutral-800">/account/delete/</code>.</li>
                <li>A 7-day grace period is provided. Logging in within 7 days automatically cancels the pending deletion.</li>
                <li>After 7 days, personal phone numbers and names are permanently irreversibly anonymized.</li>
              </ul>
            </section>

            <section className="space-y-1.5">
              <h3 className="text-sm font-bold text-neutral-900">5. Contact Information</h3>
              <p>
                For data protection officer inquiries or grievance redressal:
                <br />
                <span className="font-medium text-neutral-800">Email:</span> privacy@fixpro.in <em>(TODO(verify) legal)</em>
              </p>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}
