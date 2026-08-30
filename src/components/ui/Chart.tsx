"use client";

import React, { useState, useMemo } from "react";
import { formatCurrency } from "@/lib/finance/decimal";
import { cn } from "@/lib/utils";

export interface ChartDataPoint {
  date: string; // "YYYY-MM-DD" or timestamp
  value: number;
  label?: string;
  tooltipExtra?: string;
}

interface AreaLineChartProps {
  data: ChartDataPoint[];
  currency?: string;
  height?: number;
  color?: "emerald" | "blue" | "indigo" | "zinc" | "amber";
  emptyMessage?: string;
  valueFormatter?: (val: number) => string;
}

export function AreaLineChart({
  data,
  currency = "CNY",
  height = 220,
  color = "emerald",
  emptyMessage = "No historical data available for this timeframe.",
  valueFormatter,
}: AreaLineChartProps) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const colorStyles = useMemo(() => {
    switch (color) {
      case "blue":
        return {
          stroke: "#3b82f6",
          gradientStop: "#3b82f6",
          point: "bg-blue-500 ring-blue-200 dark:ring-blue-900",
          text: "text-blue-600 dark:text-blue-400",
        };
      case "indigo":
        return {
          stroke: "#6366f1",
          gradientStop: "#6366f1",
          point: "bg-indigo-500 ring-indigo-200 dark:ring-indigo-900",
          text: "text-indigo-600 dark:text-indigo-400",
        };
      case "amber":
        return {
          stroke: "#f59e0b",
          gradientStop: "#f59e0b",
          point: "bg-amber-500 ring-amber-200 dark:ring-amber-900",
          text: "text-amber-600 dark:text-amber-400",
        };
      case "zinc":
        return {
          stroke: "#52525b",
          gradientStop: "#71717a",
          point: "bg-zinc-700 ring-zinc-200 dark:ring-zinc-700",
          text: "text-zinc-800 dark:text-zinc-200",
        };
      case "emerald":
      default:
        return {
          stroke: "#10b981",
          gradientStop: "#10b981",
          point: "bg-emerald-500 ring-emerald-200 dark:ring-emerald-900",
          text: "text-emerald-600 dark:text-emerald-400",
        };
    }
  }, [color]);

  if (!data || data.length === 0) {
    return (
      <div
        style={{ height }}
        className="flex items-center justify-center p-6 text-xs text-zinc-400 dark:text-zinc-500 rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30"
      >
        {emptyMessage}
      </div>
    );
  }

  // Handle single-point data by duplicating for visual line
  const pointsData =
    data.length === 1
      ? [{ ...data[0], label: "Start" }, { ...data[0], label: "Current" }]
      : data;

  const values = pointsData.map((d) => d.value);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal === 0 ? 1 : maxVal - minVal;

  // ViewBox coordinates
  const svgWidth = 800;
  const svgHeight = height;
  const paddingX = 30;
  const paddingY = 30;

  const chartWidth = svgWidth - paddingX * 2;
  const chartHeight = svgHeight - paddingY * 2;

  // Calculate coordinates for points
  const points = pointsData.map((d, i) => {
    const x = paddingX + (i / (pointsData.length - 1)) * chartWidth;
    const y =
      paddingY + chartHeight - ((d.value - minVal) / range) * chartHeight;
    return { x, y, data: d, index: i };
  });

  // Construct SVG Path strings
  const linePath = points.reduce((acc, p, i) => {
    if (i === 0) return `M ${p.x} ${p.y}`;
    return `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaPath = `${linePath} L ${points[points.length - 1].x} ${
    paddingY + chartHeight
  } L ${points[0].x} ${paddingY + chartHeight} Z`;

  const activePoint = hoverIndex !== null ? points[hoverIndex] : points[points.length - 1];

  const formatValue = (v: number) => {
    if (valueFormatter) return valueFormatter(v);
    return formatCurrency(v, currency);
  };

  return (
    <div className="relative w-full select-none">
      {/* Active point indicator header */}
      <div className="flex items-center justify-between px-1 pb-2 text-xs">
        <div className="text-zinc-500 dark:text-zinc-400">
          <span className="font-semibold text-zinc-800 dark:text-zinc-200">
            {activePoint?.data.date}
          </span>
          {activePoint?.data.label && (
            <span className="ml-1.5 text-[11px] text-zinc-400">
              ({activePoint.data.label})
            </span>
          )}
        </div>
        <div className={cn("font-bold text-sm", colorStyles.text)}>
          {formatValue(activePoint.data.value)}
        </div>
      </div>

      {/* SVG Chart */}
      <div className="relative w-full overflow-hidden rounded-xl border border-zinc-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-2">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible"
          style={{ maxHeight: height }}
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            <linearGradient id={`gradient-${color}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorStyles.gradientStop} stopOpacity="0.25" />
              <stop offset="100%" stopColor={colorStyles.gradientStop} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.5, 1].map((ratio) => {
            const y = paddingY + chartHeight * ratio;
            const gridVal = maxVal - range * ratio;
            return (
              <g key={ratio}>
                <line
                  x1={paddingX}
                  y1={y}
                  x2={svgWidth - paddingX}
                  y2={y}
                  stroke="currentColor"
                  strokeDasharray="4 4"
                  className="text-zinc-100 dark:text-zinc-800/80"
                  strokeWidth="1"
                />
                <text
                  x={paddingX}
                  y={y - 4}
                  className="text-[10px] fill-zinc-400 dark:fill-zinc-600 font-medium"
                >
                  {formatValue(gridVal)}
                </text>
              </g>
            );
          })}

          {/* Area Fill */}
          <path d={areaPath} fill={`url(#gradient-${color})`} />

          {/* Stroke Line */}
          <path
            d={linePath}
            fill="none"
            stroke={colorStyles.stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Vertical cursor guideline when hovering */}
          {activePoint && (
            <line
              x1={activePoint.x}
              y1={paddingY}
              x2={activePoint.x}
              y2={paddingY + chartHeight}
              stroke="currentColor"
              className="text-zinc-300 dark:text-zinc-700"
              strokeWidth="1"
              strokeDasharray="3 3"
            />
          )}

          {/* Interactive data point triggers */}
          {points.map((p) => {
            const isHovered = hoverIndex === p.index;
            const isLast = hoverIndex === null && p.index === points.length - 1;
            const isActive = isHovered || isLast;

            return (
              <g
                key={p.index}
                className="cursor-pointer"
                onMouseEnter={() => setHoverIndex(p.index)}
                onClick={() => setHoverIndex(p.index)}
              >
                {/* Large invisible circle for touch target */}
                <circle cx={p.x} cy={p.y} r="16" fill="transparent" />

                {/* Visible active point */}
                {isActive && (
                  <>
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="6"
                      fill={colorStyles.stroke}
                      className="animate-ping opacity-30"
                    />
                    <circle
                      cx={p.x}
                      cy={p.y}
                      r="4.5"
                      fill={colorStyles.stroke}
                      stroke="white"
                      strokeWidth="2"
                    />
                  </>
                )}
              </g>
            );
          })}
        </svg>

        {/* X-Axis Date Labels */}
        <div className="flex items-center justify-between pt-2 px-3 text-[10px] text-zinc-400 font-medium border-t border-zinc-100 dark:border-zinc-800/80">
          <span>{pointsData[0]?.date}</span>
          {pointsData.length > 2 && (
            <span>{pointsData[Math.floor(pointsData.length / 2)]?.date}</span>
          )}
          <span>{pointsData[pointsData.length - 1]?.date}</span>
        </div>
      </div>
    </div>
  );
}
