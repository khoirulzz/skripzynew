"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

/**
 * RequestStatusChart - Bar chart for request status distribution
 */
export function RequestStatusChart({ data }) {
  if (!data || data.length === 0) {
    return (
      <div
        style={{
          padding: "2rem",
          backgroundColor: "var(--card)",
          borderRadius: "12px",
          border: "1px solid var(--border)",
          textAlign: "center",
        }}
      >
        <p style={{ color: "var(--text-muted)" }}>Tidak ada data request</p>
      </div>
    );
  }

  return (
    <div
      style={{
        padding: "1.5rem",
        backgroundColor: "var(--card)",
        borderRadius: "12px",
        border: "1px solid var(--border)",
      }}
    >
      <h3 style={{ margin: "0 0 1rem 0", fontSize: "1.1rem", fontWeight: 600 }}>
        Status Penggunaan Tools
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis />
          <Tooltip formatter={(value) => value.toLocaleString("id-ID")} />
          <Legend />
          <Bar dataKey="value" fill="#10B981" name="Jumlah" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
