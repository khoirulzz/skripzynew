"use client";

import { useEffect, useState } from "react";
import { subscribeToPricing } from "@/lib/adminPricing";
import { subscribeToPromos, isPromoActive } from "@/lib/adminPromos";
import {
  buildBillingCatalog,
  subscribeToUserBillingRequests,
} from "@/lib/billing";

export function useBillingCatalog() {
  const [catalog, setCatalog] = useState(() => buildBillingCatalog([]));

  useEffect(() => {
    const unsubscribe = subscribeToPricing((items) => {
      setCatalog(buildBillingCatalog(items));
    });

    return () => unsubscribe();
  }, []);

  return catalog;
}

export function useActivePromos() {
  const [promos, setPromos] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToPromos((items) => {
      setPromos(items.filter(isPromoActive));
    });

    return () => unsubscribe();
  }, []);

  return promos;
}

export function useUserBillingRequests(userId) {
  const [requests, setRequests] = useState([]);

  useEffect(() => {
    const unsubscribe = subscribeToUserBillingRequests(userId, setRequests);
    return () => unsubscribe();
  }, [userId]);

  return requests;
}
