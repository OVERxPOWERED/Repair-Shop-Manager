"use client";

import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { paiseToRupeesInput, rupeesToPaise } from "@/lib/format/money";

export interface MoneyInputProps {
  value: number; // integer paise
  onChange: (paise: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  error?: string;
  id?: string;
  enterKeyHint?: "enter" | "done" | "go" | "next" | "previous" | "search" | "send";
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
}

export function MoneyInput({
  value,
  onChange,
  placeholder = "0.00",
  disabled = false,
  className = "",
  error: externalError,
  id,
  enterKeyHint,
  onKeyDown,
}: MoneyInputProps) {
  const [text, setText] = useState(() => (value > 0 ? paiseToRupeesInput(value) : ""));
  const [isFocused, setIsFocused] = useState(false);
  const [formatError, setFormatError] = useState<string | null>(null);

  useEffect(() => {
    if (!isFocused) {
      const currentPaise = rupeesToPaise(text);
      if (currentPaise !== value) {
        setText(value > 0 ? paiseToRupeesInput(value) : "");
        setFormatError(null);
      }
    }
  }, [value, isFocused, text]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, "");
    setText(val);

    if (val.trim() === "") {
      setFormatError(null);
      onChange(0);
      return;
    }

    const parsed = rupeesToPaise(val);
    if (parsed === null) {
      setFormatError("Invalid amount");
    } else {
      setFormatError(null);
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    setIsFocused(false);
    if (text.trim() === "") {
      setText("");
      setFormatError(null);
      onChange(0);
      return;
    }

    const parsed = rupeesToPaise(text);
    if (parsed !== null) {
      setText(paiseToRupeesInput(parsed));
      setFormatError(null);
      onChange(parsed);
    } else {
      setFormatError("Invalid amount");
    }
  };

  const handleFocus = () => {
    setIsFocused(true);
  };

  const displayError = externalError || formatError;

  return (
    <div className="relative w-full">
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-neutral-400 font-semibold select-none">
        ₹
      </div>
      <Input
        id={id}
        type="text"
        inputMode="decimal"
        value={text}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        enterKeyHint={enterKeyHint}
        onKeyDown={onKeyDown}
        className={`pl-8 h-12 text-base font-semibold ${
          displayError ? "border-red-500 focus-visible:ring-red-500" : ""
        } ${className}`}
      />
      {displayError && (
        <p className="text-xs text-red-500 mt-1 font-medium">{displayError}</p>
      )}
    </div>
  );
}
