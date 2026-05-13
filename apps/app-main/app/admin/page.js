"use client";

import { useEffect, useState } from "react";
import { StatCard } from "@/components/admin/StatCard";
import { ToolUsageChart } from "@/components/admin/ToolUsageChart";
import { RequestStatusChart } from "@/components/admin/RequestStatusChart";
import {
  getTotalUsers,
  getTotalRequests,
  getRequestsByTool,
  getRequestsByStatus,
  subscribeToUserCount,
  subscribeToRequestCount,
  subscribeToRequestsByTool,
} from "@/lib/adminStats";
import { PremiumIcon } from "@/components/ui/PremiumIcon";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalRequests: 0,
    toolsUsed: 0,
    toolsData: [],
    statusData: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const [users, requests, toolData, statusData] = await Promise.all([
          getTotalUsers(),
          getTotalRequests(),
          getRequestsByTool(),
          getRequestsByStatus(),
        ]);

        setStats({
          totalUsers: users,
          totalRequests: requests,
          toolsUsed: toolData.length,
          toolsData: toolData,
          statusData: statusData,
        });
        setLoading(false);
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        setLoading(false);
      }
    };

    loadInitialData();
  }, []);

  // Setup real-time listeners
  useEffect(() => {
    const unsubscribeUsers = subscribeToUserCount((count) => {
      setStats((prev) => ({ ...prev, totalUsers: count }));
    });

    const unsubscribeRequests = subscribeToRequestCount((count) => {
      setStats((prev) => ({ ...prev, totalRequests: count }));
    });

    const unsubscribeTools = subscribeToRequestsByTool((data) => {
      setStats((prev) => ({
        ...prev,
        toolsData: data,
        toolsUsed: data.length,
      }));
    });

    return () => {
      unsubscribeUsers();
      unsubscribeRequests();
      unsubscribeTools();
    };
  }, []);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          flexDirection: "column",
          gap: "1rem",
        }}
      >
        <PremiumIcon name="loader" size={48} style={{ animation: "spin 1s linear infinite" }} />
        <p style={{ color: "var(--text-muted)" }}>Memuat dashboard...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", margin: "0 0 0.5rem 0" }}>
          Dashboard Admin
        </h1>
        <p style={{ color: "var(--text-muted)", margin: 0, fontSize: "0.95rem" }}>
          Ringkasan statistik penggunaan platform Skripzy
        </p>
      </div>

      {/* Stats Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        <StatCard
          icon="users"
          label="Total User"
          value={stats.totalUsers}
          color="primary"
        />
        <StatCard
          icon="zap"
          label="Total Request"
          value={stats.totalRequests}
          color="success"
        />
        <StatCard
          icon="layers"
          label="Tools Terpakai"
          value={stats.toolsUsed}
          color="warning"
        />
        <StatCard
          icon="activity"
          label="Rata-rata Req/User"
          value={
            stats.totalUsers > 0
              ? (stats.totalRequests / stats.totalUsers).toFixed(1)
              : "0"
          }
          color="info"
        />
      </div>

      {/* Charts Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: "1.5rem",
        }}
      >
        <div>
          <ToolUsageChart data={stats.toolsData} />
        </div>
        <div>
          <RequestStatusChart data={stats.statusData} />
        </div>
      </div>

      {/* Data Table */}
      <div
        style={{
          marginTop: "2rem",
          padding: "1.5rem",
          backgroundColor: "var(--card)",
          borderRadius: "12px",
          border: "1px solid var(--border)",
        }}
      >
        <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 1rem 0" }}>
          Detail Penggunaan Tools
        </h3>
        {stats.toolsData.length > 0 ? (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "2px solid var(--border)" }}>
                  <th
                    style={{
                      textAlign: "left",
                      padding: "0.75rem",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                    }}
                  >
                    Tool Name
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "0.75rem",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                    }}
                  >
                    Jumlah Request
                  </th>
                  <th
                    style={{
                      textAlign: "right",
                      padding: "0.75rem",
                      fontWeight: 600,
                      color: "var(--text-muted)",
                    }}
                  >
                    Persentase
                  </th>
                </tr>
              </thead>
              <tbody>
                {stats.toolsData.map((tool, idx) => {
                  const percentage =
                    stats.totalRequests > 0
                      ? ((tool.value / stats.totalRequests) * 100).toFixed(1)
                      : 0;
                  return (
                    <tr
                      key={idx}
                      style={{
                        borderBottom: "1px solid var(--border)",
                        "&:hover": { backgroundColor: "var(--surface-hover)" },
                      }}
                    >
                      <td style={{ padding: "0.75rem", fontWeight: 500 }}>
                        {tool.name}
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "right" }}>
                        {tool.value.toLocaleString("id-ID")}
                      </td>
                      <td style={{ padding: "0.75rem", textAlign: "right" }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "flex-end",
                            gap: "0.5rem",
                          }}
                        >
                          <div
                            style={{
                              width: "100px",
                              height: "6px",
                              backgroundColor: "var(--surface-hover)",
                              borderRadius: "3px",
                              overflow: "hidden",
                            }}
                          >
                            <div
                              style={{
                                width: `${percentage}%`,
                                height: "100%",
                                backgroundColor: "var(--primary)",
                              }}
                            />
                          </div>
                          <span style={{ minWidth: "45px", textAlign: "right" }}>
                            {percentage}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: "var(--text-muted)", textAlign: "center" }}>
            Tidak ada data penggunaan tools
          </p>
        )}
      </div>
    </div>
  );
}
