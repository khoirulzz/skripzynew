"use client";
import { useState, useEffect, useRef } from "react";
import { Bell } from "lucide-react";
import { d1Request } from "@/lib/d1Client";
import Link from "next/link";
import { useRouter } from "next/navigation";

export function NotificationsPopover({ isMobile = false }) {
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const popoverRef = useRef(null);
    const router = useRouter();

    const fetchNotifications = async () => {
        try {
            const res = await d1Request("notifications");
            if (res && res.data) {
                // Determine read status for global notifications
                const readGlobalsStr = localStorage.getItem("skripzy_read_globals") || "[]";
                let readGlobals = [];
                try { readGlobals = JSON.parse(readGlobalsStr); } catch (e) {}

                const formattedData = res.data.map(notif => {
                    const isGlobal = !notif.userId;
                    let isRead = notif.isRead;
                    if (isGlobal) {
                        isRead = readGlobals.includes(notif.id);
                    }
                    return { ...notif, isRead, isGlobal };
                });

                setNotifications(formattedData);
                setUnreadCount(formattedData.filter(n => !n.isRead).length);
            }
        } catch (error) {
            console.error("Failed to fetch notifications:", error);
        }
    };

    useEffect(() => {
        fetchNotifications();
        // Optional: poll every 3 minutes
        const interval = setInterval(fetchNotifications, 180000);
        return () => clearInterval(interval);
    }, []);

    // Close on outside click
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (popoverRef.current && !popoverRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleMarkAllRead = async () => {
        const unreadPrivates = notifications.filter(n => !n.isRead && !n.isGlobal);
        const unreadGlobals = notifications.filter(n => !n.isRead && n.isGlobal);

        // Update globals in localStorage
        if (unreadGlobals.length > 0) {
            const readGlobalsStr = localStorage.getItem("skripzy_read_globals") || "[]";
            let readGlobals = [];
            try { readGlobals = JSON.parse(readGlobalsStr); } catch (e) {}
            readGlobals = [...new Set([...readGlobals, ...unreadGlobals.map(n => n.id)])];
            localStorage.setItem("skripzy_read_globals", JSON.stringify(readGlobals));
        }

        // Optimistically update UI
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
        setUnreadCount(0);

        // Update privates in DB (parallel patches)
        if (unreadPrivates.length > 0) {
            try {
                await Promise.all(
                    unreadPrivates.map(n =>
                        d1Request("notifications", {
                            method: "PATCH",
                            id: n.id,
                            body: { isRead: 1 }
                        })
                    )
                );
            } catch (err) {
                console.error("Failed to mark private notifications as read", err);
            }
        }
    };

    const handleNotificationClick = async (notif) => {
        setIsOpen(false);

        // Mark this single notification as read if it isn't already
        if (!notif.isRead) {
            if (notif.isGlobal) {
                const readGlobalsStr = localStorage.getItem("skripzy_read_globals") || "[]";
                let readGlobals = [];
                try { readGlobals = JSON.parse(readGlobalsStr); } catch (e) {}
                readGlobals.push(notif.id);
                localStorage.setItem("skripzy_read_globals", JSON.stringify(readGlobals));
            } else {
                d1Request("notifications", {
                    method: "PATCH",
                    id: notif.id,
                    body: { isRead: 1 }
                }).catch(e => console.error(e));
            }
            
            setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
            setUnreadCount(prev => Math.max(0, prev - 1));
        }

        if (notif.actionUrl) {
            router.push(notif.actionUrl);
        }
    };

    return (
        <div className="relative" ref={popoverRef} style={{ display: 'flex', alignItems: 'center' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="btn btn-ghost relative"
                style={{
                    padding: "0.45rem",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center"
                }}
                title="Notifikasi"
            >
                <Bell size={18} color="var(--text-main)" />
                {unreadCount > 0 && (
                    <span 
                        style={{
                            position: "absolute",
                            top: "2px",
                            right: "2px",
                            backgroundColor: "var(--danger, #ef4444)",
                            color: "white",
                            fontSize: "0.65rem",
                            fontWeight: "bold",
                            minWidth: "16px",
                            height: "16px",
                            borderRadius: "8px",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            padding: "0 4px",
                            boxShadow: "0 0 0 2px var(--bg-main)"
                        }}
                    >
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div 
                    className="glass-panel"
                    style={{
                        position: "absolute",
                        top: "calc(100% + 0.5rem)",
                        right: isMobile ? "-10px" : "0",
                        width: isMobile ? "300px" : "320px",
                        maxWidth: "calc(100vw - 20px)",
                        zIndex: 50,
                        padding: "0",
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                        boxShadow: "0 10px 40px rgba(0,0,0,0.15)",
                        animation: "fadeIn 0.2s ease-out"
                    }}
                >
                    <div style={{
                        padding: "1rem",
                        borderBottom: "1px solid rgba(79,70,229,0.1)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        backgroundColor: "var(--bg-main)",
                    }}>
                        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Notifikasi</h3>
                        {unreadCount > 0 && (
                            <button 
                                onClick={handleMarkAllRead}
                                style={{
                                    background: "none",
                                    border: "none",
                                    color: "var(--primary)",
                                    fontSize: "0.8rem",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    padding: 0
                                }}
                            >
                                Tandai Semua Dibaca
                            </button>
                        )}
                    </div>
                    
                    <div style={{
                        maxHeight: "350px",
                        overflowY: "auto",
                        backgroundColor: "var(--bg-main)",
                    }}>
                        {notifications.length === 0 ? (
                            <div style={{ padding: "2rem 1rem", textAlign: "center", color: "var(--text-muted)", fontSize: "0.9rem" }}>
                                Belum ada notifikasi.
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <div 
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    style={{
                                        padding: "1rem",
                                        borderBottom: "1px solid rgba(79,70,229,0.05)",
                                        backgroundColor: notif.isRead ? "transparent" : "rgba(79,70,229,0.03)",
                                        cursor: notif.actionUrl ? "pointer" : "default",
                                        transition: "background-color 0.2s",
                                        display: "flex",
                                        gap: "0.75rem"
                                    }}
                                    onMouseEnter={e => e.currentTarget.style.backgroundColor = notif.isRead ? "rgba(79,70,229,0.02)" : "rgba(79,70,229,0.06)"}
                                    onMouseLeave={e => e.currentTarget.style.backgroundColor = notif.isRead ? "transparent" : "rgba(79,70,229,0.03)"}
                                >
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem", alignItems: "flex-start" }}>
                                            <h4 style={{ 
                                                margin: 0, 
                                                fontSize: "0.9rem", 
                                                fontWeight: notif.isRead ? 500 : 700,
                                                color: "var(--text-main)",
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.4rem"
                                            }}>
                                                {!notif.isRead && (
                                                    <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--primary)", display: "inline-block" }}></span>
                                                )}
                                                {notif.title}
                                            </h4>
                                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", flexShrink: 0, marginLeft: "0.5rem" }}>
                                                {new Date(notif.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short" })}
                                            </span>
                                        </div>
                                        <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", lineHeight: 1.4, wordBreak: "break-word" }}>
                                            {notif.message}
                                        </p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
