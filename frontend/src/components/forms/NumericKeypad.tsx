"use client";

import React from "react";
import { Delete } from "lucide-react";
import { hapticTick } from "@/native/haptics";

interface NumericKeypadProps {
  onKeyPress: (digit: string) => void;
  onBackspace: () => void;
  disabled?: boolean;
}

export function NumericKeypad({ onKeyPress, onBackspace, disabled = false }: NumericKeypadProps) {
  const handleDigit = (digit: string) => {
    if (disabled) return;
    hapticTick();
    onKeyPress(digit);
  };

  const handleBackspace = () => {
    if (disabled) return;
    hapticTick();
    onBackspace();
  };

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    ["", "0", "backspace"],
  ];

  return (
    <div className="w-full max-w-sm mx-auto grid grid-cols-3 gap-3 p-2 select-none">
      {keys.flat().map((k, index) => {
        if (k === "") {
          return <div key={`empty-${index}`} className="h-16 w-full" />;
        }

        if (k === "backspace") {
          return (
            <button
              key="backspace"
              type="button"
              disabled={disabled}
              onClick={handleBackspace}
              aria-label="Backspace"
              className="h-16 w-full flex items-center justify-center rounded-2xl bg-neutral-100 text-neutral-700 hover:bg-neutral-200 active:scale-95 active:bg-neutral-300 transition-transform disabled:opacity-50 disabled:pointer-events-none"
            >
              <Delete className="w-6 h-6" />
            </button>
          );
        }

        return (
          <button
            key={k}
            type="button"
            disabled={disabled}
            onClick={() => handleDigit(k)}
            className="h-16 w-full flex items-center justify-center rounded-2xl bg-neutral-100 text-neutral-900 text-2xl font-semibold hover:bg-neutral-200 active:scale-95 active:bg-neutral-300 transition-transform disabled:opacity-50 disabled:pointer-events-none"
          >
            {k}
          </button>
        );
      })}
    </div>
  );
}
