"use client";

import React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepProgressBarProps {
  currentStep: number;
  totalSteps?: number;
  labels?: string[];
  className?: string;
}

export function StepProgressBar({
  currentStep,
  totalSteps = 3,
  labels = ["Shop", "Contact", "Billing"],
  className,
}: StepProgressBarProps) {
  return (
    <div className={cn("w-full py-3", className)}>
      <div className="flex items-center justify-between relative">
        {/* Background track line */}
        <div className="absolute top-4 left-6 right-6 h-0.5 bg-neutral-200 -z-0" />
        {/* Active progress fill */}
        <div
          className="absolute top-4 left-6 h-0.5 bg-primary transition-all duration-300 -z-0"
          style={{
            width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%`,
          }}
        />

        {Array.from({ length: totalSteps }).map((_, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;

          return (
            <div key={index} className="flex flex-col items-center z-10">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all shadow-sm",
                  isCompleted && "bg-primary text-primary-foreground",
                  isCurrent &&
                    "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-105",
                  !isCompleted && !isCurrent && "bg-neutral-100 text-neutral-400 border border-neutral-200"
                )}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : stepNumber}
              </div>

              {labels[index] && (
                <span
                  className={cn(
                    "mt-1.5 text-[11px] font-semibold tracking-tight transition-colors",
                    isCurrent ? "text-neutral-950 font-bold" : "text-neutral-400"
                  )}
                >
                  {labels[index]}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
