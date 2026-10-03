"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { paiseToRupeesInput, rupeesToPaise } from "@/lib/format/money";

interface MoneyInputProps {
  value: number; // integer paise
  onChange: (paise: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
}

export function MoneyInput({
  value,
  onChange,
  placeholder = "0.00",
  disabled = false,
  className = "",
  error,
}: MoneyInputProps) {
  const [text, setText] = useState(() => (value > 0 ? (value / 100).toString() : ""));

  useEffect(() => {
    const currentPaise = rupeesToPaise(text) ?? 0;
    if (currentPaise !== value) {
      setText(value > 0 ? (value / 100).toString() : "");
    }
  }, [value, text]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, "");
    setText(val);
    const parsed = rupeesToPaise(val);
    onChange(parsed ?? 0);
  };

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400 font-semibold">
        ₹
      </div>
      <Input
        type="text"
        inputMode="decimal"
        value={text}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`pl-8 h-12 text-base font-semibold ${
          error ? "border-red-500" : ""
        } ${className}`}
      />
      {error && <p className="text-xs text-red-500 mt-1 font-medium">{error}</p>}
    </div>
  );
}
