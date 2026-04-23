"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const COLORS = ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#14B8A6"];

/**
 * ToolUsageChart - Pie chart for tool usage distribution
 */
export function ToolUsageChart({ data }) {
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
        <p style={{ color: "var(--text-muted)" }}>Tidak ada data penggunaan tools</p>
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
        Distribusi Penggunaan Tools
      </h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, value }) => `${name} (${value})`}
            outerRadius={100}
            fill="#8884d8"
            dataKey="value"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip formatter={(value) => value.toLocaleString("id-ID")} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
