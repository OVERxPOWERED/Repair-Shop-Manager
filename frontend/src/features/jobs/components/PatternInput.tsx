"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { hapticTick } from "@/native/haptics";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PatternInputProps {
  value?: string;
  onChange: (pattern: string) => void;
  error?: string;
  disabled?: boolean;
}

type Point = { id: number; x: number; y: number };

const DOT_COORDS: Point[] = [
  { id: 1, x: 50, y: 50 },
  { id: 2, x: 150, y: 50 },
  { id: 3, x: 250, y: 50 },
  { id: 4, x: 50, y: 150 },
  { id: 5, x: 150, y: 150 },
  { id: 6, x: 250, y: 150 },
  { id: 7, x: 50, y: 250 },
  { id: 8, x: 150, y: 250 },
  { id: 9, x: 250, y: 250 },
];

const HIT_RADIUS = 36;

export function PatternInput({ value = "", onChange, error, disabled = false }: PatternInputProps) {
  const t = useTranslations("intake");
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNodes, setSelectedNodes] = useState<number[]>(() => {
    if (!value) return [];
    return value
      .split("-")
      .map((s) => parseInt(s, 10))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 9);
  });
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPointer, setCurrentPointer] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!value) {
      setSelectedNodes([]);
    } else {
      const parsed = value
        .split("-")
        .map((s) => parseInt(s, 10))
        .filter((n) => !isNaN(n) && n >= 1 && n <= 9);
      setSelectedNodes(parsed);
    }
  }, [value]);

  const getSvgCoordinates = useCallback((clientX: number, clientY: number): { x: number; y: number } | null => {
    if (!containerRef.current) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const x = ((clientX - rect.left) / rect.width) * 300;
    const y = ((clientY - rect.top) / rect.height) * 300;
    return { x, y };
  }, []);

  const findHitDot = useCallback((x: number, y: number): number | null => {
    for (const dot of DOT_COORDS) {
      const dx = dot.x - x;
      const dy = dot.y - y;
      if (dx * dx + dy * dy <= HIT_RADIUS * HIT_RADIUS) {
        return dot.id;
      }
    }
    return null;
  }, []);

  const addNode = useCallback(
    (nodeId: number, currentList: number[]) => {
      if (currentList.includes(nodeId)) return currentList;
      void hapticTick();
      const next = [...currentList, nodeId];
      onChange(next.join("-"));
      return next;
    },
    [onChange]
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    const coords = getSvgCoordinates(e.clientX, e.clientY);
    if (!coords) return;
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);

    setIsDrawing(true);
    setCurrentPointer(coords);

    const hit = findHitDot(coords.x, coords.y);
    if (hit) {
      // Start fresh pattern if tapped/dragged
      setSelectedNodes((prev) => {
        // If clicking a new node after a completed pattern, start fresh
        const next = [hit];
        onChange(next.join("-"));
        void hapticTick();
        return next;
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing || disabled) return;
    const coords = getSvgCoordinates(e.clientX, e.clientY);
    if (!coords) return;

    setCurrentPointer(coords);
    const hit = findHitDot(coords.x, coords.y);
    if (hit) {
      setSelectedNodes((prev) => addNode(hit, prev));
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    setCurrentPointer(null);
    try {
      (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handleClear = () => {
    setSelectedNodes([]);
    onChange("");
  };

  return (
    <div className="flex flex-col items-center select-none">
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative w-[240px] h-[240px] sm:w-[260px] sm:h-[260px] touch-none select-none bg-neutral-900/5 dark:bg-neutral-800/40 rounded-3xl p-2 border ${
          error
            ? "border-red-500 shadow-sm shadow-red-500/10"
            : "border-neutral-200 dark:border-neutral-800"
        } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
      >
        <svg viewBox="0 0 300 300" className="w-full h-full">
          {/* Lines between connected nodes */}
          {selectedNodes.map((nodeId, idx) => {
            if (idx === 0) return null;
            const prevId = selectedNodes[idx - 1];
            const p1 = DOT_COORDS[prevId - 1];
            const p2 = DOT_COORDS[nodeId - 1];
            return (
              <line
                key={`line-${prevId}-${nodeId}`}
                x1={p1.x}
                y1={p1.y}
                x2={p2.x}
                y2={p2.y}
                stroke="rgb(14 165 233)" // primary color (sky-500)
                strokeWidth="6"
                strokeLinecap="round"
                className="transition-all"
              />
            );
          })}

          {/* Line following current pointer during active drag */}
          {isDrawing && currentPointer && selectedNodes.length > 0 && (
            <line
              x1={DOT_COORDS[selectedNodes[selectedNodes.length - 1] - 1].x}
              y1={DOT_COORDS[selectedNodes[selectedNodes.length - 1] - 1].y}
              x2={currentPointer.x}
              y2={currentPointer.y}
              stroke="rgb(14 165 233 / 0.6)"
              strokeWidth="4"
              strokeDasharray="4 4"
              strokeLinecap="round"
            />
          )}

          {/* 3x3 Nodes */}
          {DOT_COORDS.map((dot) => {
            const isSelected = selectedNodes.includes(dot.id);
            const isLast = selectedNodes[selectedNodes.length - 1] === dot.id;
            const index = selectedNodes.indexOf(dot.id);

            return (
              <g key={`dot-${dot.id}`} className="transition-transform">
                {/* Hit target circle */}
                <circle cx={dot.x} cy={dot.y} r={HIT_RADIUS} fill="transparent" />

                {/* Outer ring if selected */}
                {isSelected && (
                  <circle
                    cx={dot.x}
                    cy={dot.y}
                    r="24"
                    fill="rgb(14 165 233 / 0.15)"
                    stroke="rgb(14 165 233)"
                    strokeWidth="2.5"
                    className={isLast ? "animate-pulse" : ""}
                  />
                )}

                {/* Central dot */}
                <circle
                  cx={dot.x}
                  cy={dot.y}
                  r={isSelected ? "9" : "8"}
                  fill={isSelected ? "rgb(14 165 233)" : "currentColor"}
                  className={`transition-colors ${
                    isSelected
                      ? "text-sky-500"
                      : "text-neutral-400 dark:text-neutral-500 hover:text-neutral-600"
                  }`}
                />

                {/* Step number badge inside circle if connected */}
                {isSelected && (
                  <text
                    x={dot.x}
                    y={dot.y + 3.5}
                    textAnchor="middle"
                    fill="#ffffff"
                    fontSize="10"
                    fontWeight="bold"
                    pointerEvents="none"
                  >
                    {index + 1}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      <div className="flex items-center justify-between w-full max-w-[260px] mt-2.5 px-1">
        <span className="text-xs text-neutral-500 font-medium">
          {selectedNodes.length > 0
            ? t("patternConnected", { count: selectedNodes.length })
            : t("patternPrompt")}
        </span>

        {selectedNodes.length > 0 && !disabled && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="h-8 px-2 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            {t("patternClear")}
          </Button>
        )}
      </div>

      {error && <p className="text-xs text-red-500 font-medium mt-1">{error}</p>}
    </div>
  );
}
