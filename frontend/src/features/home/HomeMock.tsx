"use client";

import React, { useState } from "react";
import {
  Wrench,
  Bell,
  ChevronDown,
  Calendar,
  Plus,
  FileText,
  Receipt,
  Smartphone,
  Cpu,
  ShoppingBag,
  ShieldCheck,
  Store,
  TrendingUp,
  AlertTriangle,
  LayoutDashboard,
  Users,
  Package,
  Grid,
  ChevronRight,
  Clock,
} from "lucide-react";

export function HomeMock() {
  const [activeTab, setActiveTab] = useState<"home" | "jobs" | "customers" | "inventory" | "more">("home");

  return (
    <div className="flex-1 flex flex-col pb-20">
      {/* 1. App Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-neutral-100 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-neutral-950 flex items-center justify-center text-white shadow-sm">
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <button className="flex items-center gap-1 text-sm font-bold text-neutral-950 hover:opacity-80 transition-opacity">
              <span>M Solution</span>
              <ChevronDown className="w-4 h-4 text-neutral-500" />
            </button>
            <p className="text-[11px] text-neutral-500 font-medium">Mobile Repair Shop</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button className="relative w-9 h-9 rounded-full bg-neutral-50 border border-neutral-200/80 flex items-center justify-center text-neutral-700 hover:bg-neutral-100 transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white" />
          </button>
          <div className="w-9 h-9 rounded-full bg-neutral-200 border border-neutral-300 flex items-center justify-center text-xs font-bold text-neutral-800 overflow-hidden">
            BB
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 pt-4 space-y-4">
        {/* Greeting & Date */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-neutral-950">
              Good Morning, Burhanuddin
            </h1>
            <p className="text-xs text-neutral-500 mt-0.5">Let&apos;s keep your shop running smoothly.</p>
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-50 border border-neutral-200 text-xs font-medium text-neutral-700">
            <Calendar className="w-3.5 h-3.5 text-neutral-500" />
            <span>Thu, 2 Oct</span>
            <ChevronRight className="w-3 h-3 text-neutral-400" />
          </button>
        </div>

        {/* 2. Dark Hero Metric Card */}
        <div className="bg-neutral-950 text-white rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-neutral-400">Today&apos;s Jobs</p>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-3xl font-extrabold tracking-tight tabular-nums">12</span>
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3" /> +20% from yesterday
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center">
              <Wrench className="w-6 h-6 text-neutral-300" />
            </div>
          </div>

          {/* Sub Counters */}
          <div className="grid grid-cols-4 gap-2 pt-3 border-t border-neutral-800/80 text-center">
            <div>
              <div className="text-base font-bold tabular-nums text-white">4</div>
              <div className="text-[10px] text-neutral-400 font-medium">In Progress</div>
            </div>
            <div>
              <div className="text-base font-bold tabular-nums text-amber-400">3</div>
              <div className="text-[10px] text-neutral-400 font-medium">Pending</div>
            </div>
            <div>
              <div className="text-base font-bold tabular-nums text-emerald-400">3</div>
              <div className="text-[10px] text-neutral-400 font-medium">Repaired</div>
            </div>
            <div>
              <div className="text-base font-bold tabular-nums text-purple-400">2</div>
              <div className="text-[10px] text-neutral-400 font-medium">Delivered</div>
            </div>
          </div>
        </div>

        {/* 3. Quick Actions Grid (8 Tiles) */}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 mb-2.5">
            Quick Operations
          </h2>
          <div className="grid grid-cols-4 gap-2.5">
            {/* Tile 1: Primary CTA */}
            <button className="col-span-1 aspect-square rounded-2xl bg-neutral-950 text-white flex flex-col items-center justify-center p-2 text-center shadow-sm active:scale-95 transition-transform">
              <Plus className="w-5 h-5 mb-1 text-white" />
              <span className="text-[11px] font-bold leading-tight">Add Job</span>
            </button>

            {/* Tile 2: Rough Reg */}
            <button className="col-span-1 aspect-square rounded-2xl bg-white border border-neutral-200/90 text-neutral-800 flex flex-col items-center justify-center p-2 text-center hover:bg-neutral-50 active:scale-95 transition-transform">
              <FileText className="w-5 h-5 mb-1 text-neutral-700" />
              <span className="text-[11px] font-medium leading-tight">Rough Reg</span>
            </button>

            {/* Tile 3: Quick Bill */}
            <button className="col-span-1 aspect-square rounded-2xl bg-white border border-neutral-200/90 text-neutral-800 flex flex-col items-center justify-center p-2 text-center hover:bg-neutral-50 active:scale-95 transition-transform">
              <Receipt className="w-5 h-5 mb-1 text-neutral-700" />
              <span className="text-[11px] font-medium leading-tight">Quick Bill</span>
            </button>

            {/* Tile 4: Old Buy */}
            <button className="col-span-1 aspect-square rounded-2xl bg-white border border-neutral-200/90 text-neutral-800 flex flex-col items-center justify-center p-2 text-center hover:bg-neutral-50 active:scale-95 transition-transform">
              <Smartphone className="w-5 h-5 mb-1 text-neutral-700" />
              <span className="text-[11px] font-medium leading-tight">Old Buy</span>
            </button>

            {/* Tile 5: H/W Match */}
            <button className="col-span-1 aspect-square rounded-2xl bg-white border border-neutral-200/90 text-neutral-800 flex flex-col items-center justify-center p-2 text-center hover:bg-neutral-50 active:scale-95 transition-transform">
              <Cpu className="w-5 h-5 mb-1 text-neutral-700" />
              <span className="text-[11px] font-medium leading-tight">H/W Match</span>
            </button>

            {/* Tile 6: Demands */}
            <button className="col-span-1 aspect-square rounded-2xl bg-white border border-neutral-200/90 text-neutral-800 flex flex-col items-center justify-center p-2 text-center hover:bg-neutral-50 active:scale-95 transition-transform">
              <ShoppingBag className="w-5 h-5 mb-1 text-neutral-700" />
              <span className="text-[11px] font-medium leading-tight">Demands</span>
            </button>

            {/* Tile 7: Stolen Check */}
            <button className="col-span-1 aspect-square rounded-2xl bg-white border border-neutral-200/90 text-neutral-800 flex flex-col items-center justify-center p-2 text-center hover:bg-neutral-50 active:scale-95 transition-transform">
              <ShieldCheck className="w-5 h-5 mb-1 text-neutral-700" />
              <span className="text-[11px] font-medium leading-tight">Stolen Check</span>
            </button>

            {/* Tile 8: Dealers */}
            <button className="col-span-1 aspect-square rounded-2xl bg-white border border-neutral-200/90 text-neutral-800 flex flex-col items-center justify-center p-2 text-center hover:bg-neutral-50 active:scale-95 transition-transform">
              <Store className="w-5 h-5 mb-1 text-neutral-700" />
              <span className="text-[11px] font-medium leading-tight">Dealers</span>
            </button>
          </div>
        </div>

        {/* 4. Financial & Stock Summary Widgets */}
        <div className="grid grid-cols-2 gap-3">
          {/* Revenue Widget */}
          <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500">Revenue</span>
                <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                  +18%
                </span>
              </div>
              <div className="text-lg font-bold tabular-nums text-neutral-950 mt-1">
                ₹24,850
              </div>
            </div>
            <p className="text-[10px] text-neutral-400 mt-2">vs last week</p>
          </div>

          {/* Low Stock Items Widget */}
          <div className="bg-white border border-neutral-200/90 rounded-2xl p-4 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-neutral-500">Low Stock</span>
                <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              </div>
              <div className="mt-1.5 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-700 truncate max-w-[90px]">iPhone 13 Screen</span>
                  <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 rounded">3 left</span>
                </div>
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-700 truncate max-w-[90px]">Type-C Port</span>
                  <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 px-1.5 rounded">4 left</span>
                </div>
              </div>
            </div>
            <p className="text-[10px] text-neutral-400 mt-2">2 items critical</p>
          </div>
        </div>

        {/* 5. Recent Job Sheets */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-neutral-500">
              Recent Job Sheets
            </h2>
            <button className="text-xs font-medium text-neutral-950 hover:underline flex items-center gap-0.5">
              <span>View All</span>
              <ChevronRight className="w-3 h-3 text-neutral-400" />
            </button>
          </div>

          <div className="space-y-2.5">
            {/* Job Item 1 */}
            <div className="bg-white border border-neutral-200/90 rounded-2xl p-3.5 flex items-center justify-between active:bg-neutral-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 font-bold text-xs">
                  #1028
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">Rahul Verma</h3>
                  <p className="text-xs text-neutral-500">iPhone 13 • Screen Replacement</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                  In Progress
                </span>
                <p className="text-[10px] text-neutral-400 mt-1 flex items-center justify-end gap-1">
                  <Clock className="w-2.5 h-2.5" /> 2h ago
                </p>
              </div>
            </div>

            {/* Job Item 2 */}
            <div className="bg-white border border-neutral-200/90 rounded-2xl p-3.5 flex items-center justify-between active:bg-neutral-50 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-neutral-100 flex items-center justify-center text-neutral-700 font-bold text-xs">
                  #1027
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-neutral-950">Sneha Patel</h3>
                  <p className="text-xs text-neutral-500">Dell Laptop • Not Powering On</p>
                </div>
              </div>
              <div className="text-right">
                <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                  Pending
                </span>
                <p className="text-[10px] text-neutral-400 mt-1 flex items-center justify-end gap-1">
                  <Clock className="w-2.5 h-2.5" /> 5h ago
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* 6. Fixed Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/95 backdrop-blur-md border-t border-neutral-200/80 px-4 py-2 flex items-center justify-around z-40">
        <button
          onClick={() => setActiveTab("home")}
          className={`flex flex-col items-center gap-1 py-1 transition-colors ${
            activeTab === "home" ? "text-neutral-950" : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] font-medium">Home</span>
        </button>

        <button
          onClick={() => setActiveTab("jobs")}
          className={`flex flex-col items-center gap-1 py-1 transition-colors ${
            activeTab === "jobs" ? "text-neutral-950" : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          <Wrench className="w-5 h-5" />
          <span className="text-[10px] font-medium">Jobs</span>
        </button>

        <button
          onClick={() => setActiveTab("customers")}
          className={`flex flex-col items-center gap-1 py-1 transition-colors ${
            activeTab === "customers" ? "text-neutral-950" : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] font-medium">Customers</span>
        </button>

        <button
          onClick={() => setActiveTab("inventory")}
          className={`flex flex-col items-center gap-1 py-1 transition-colors ${
            activeTab === "inventory" ? "text-neutral-950" : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          <Package className="w-5 h-5" />
          <span className="text-[10px] font-medium">Inventory</span>
        </button>

        <button
          onClick={() => setActiveTab("more")}
          className={`flex flex-col items-center gap-1 py-1 transition-colors ${
            activeTab === "more" ? "text-neutral-950" : "text-neutral-400 hover:text-neutral-600"
          }`}
        >
          <Grid className="w-5 h-5" />
          <span className="text-[10px] font-medium">More</span>
        </button>
      </nav>
    </div>
  );
}
