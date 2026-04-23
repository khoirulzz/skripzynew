"use client";

import { PremiumIcon } from "@/components/ui/PremiumIcon";

/**
 * StatCard - Display single statistic with icon and value
 */
export function StatCard({ icon, label, value, trend = null, color = "primary" }) {
  return (
    <div
      style={{
        padding: "1.5rem",
        backgroundColor: "var(--card)",
        borderRadius: "12px",
        border: "1px solid var(--border)",
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        minHeight: "120px",
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "12px",
          backgroundColor: `var(--surface-hover)`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <PremiumIcon name={icon} size={28} style={{ color: `var(--${color})` }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0, marginBottom: "0.5rem" }}>
          {label}
        </p>
        <h3 style={{ fontSize: "2rem", fontWeight: 700, margin: 0, color: "var(--text-main)" }}>
          {typeof value === "number" ? value.toLocaleString("id-ID") : value}
        </h3>
        {trend && (
          <p
            style={{
              fontSize: "0.75rem",
              color: trend > 0 ? "var(--success)" : "var(--danger)",
              margin: "0.25rem 0 0 0",
            }}
          >
            {trend > 0 ? "↑" : "↓"} {Math.abs(trend)}% dari bulan lalu
          </p>
        )}
      </div>
    </div>
  );
}
