"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { d1Request } from "@/lib/d1Client";

const AuthContext = createContext({
  user: null,
  userData: null,
  loading: true,
});

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let intervalId = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (intervalId) {
        clearInterval(intervalId);
        intervalId = null;
      }

      if (firebaseUser) {
        setLoading(true);
        
        const fetchUserData = async () => {
          try {
            const userResp = await d1Request("users", { id: firebaseUser.uid });
            if (userResp && userResp.data) {
              setUserData(userResp.data);
            } else {
              setUserData(null);
            }
          } catch (err) {
            console.error("Failed to fetch user data:", err);
          } finally {
            setLoading(false);
          }
        };

        await fetchUserData();
        intervalId = setInterval(fetchUserData, 30000); // Poll every 30s for credit updates
      } else {
        setUserData(null);
        setLoading(false);
      }
    });

    return () => {
      if (intervalId) clearInterval(intervalId);
      unsubscribeAuth();
    };
  }, []);

  const refreshUserData = async () => {
    if (!user) return;
    try {
      const userResp = await d1Request("users", { id: user.uid });
      if (userResp && userResp.data) {
        setUserData(userResp.data);
      } else {
        setUserData(null);
      }
    } catch (err) {
      console.error("Failed to fetch user data:", err);
    }
  };

  useEffect(() => {
    if (!user) return;
    const handleCreditsUpdate = () => {
      refreshUserData();
    };
    window.addEventListener("skripzy:credits_updated", handleCreditsUpdate);
    return () => window.removeEventListener("skripzy:credits_updated", handleCreditsUpdate);
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, userData, loading, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
