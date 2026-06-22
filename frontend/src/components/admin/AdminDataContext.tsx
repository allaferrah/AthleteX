"use client";

import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from "react";
import { adminAPI, paymentAPI, sportCategoryAPI } from "@/lib/api";

interface AdminData {
  stats: any;
  users: any[];
  services: any[];
  orders: any[];
  reviews: any[];
  heldFunds: any[];
  reports: any[];
  flagged: any[];
  sports: any[];
  platformStats: any;
  platformFees: any[];
  aiConfig: any;
  aiUsers: any[];
}

interface AdminDataContextValue {
  data: AdminData;
  loading: boolean;
  refresh: () => void;
}

const defaults: AdminData = {
  stats: null, users: [], services: [], orders: [], reviews: [],
  heldFunds: [], reports: [], flagged: [], sports: [],
  platformStats: null, platformFees: [], aiConfig: null, aiUsers: [],
};

const AdminDataContext = createContext<AdminDataContextValue>({
  data: defaults,
  loading: true,
  refresh: () => {},
});

export function AdminDataProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AdminData>(defaults);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [
        stats, users, services, orders, reviews,
        heldFunds, reports, flagged, sports,
        platformStats, platformFees, aiConfig, aiUsers,
      ] = await Promise.all([
        adminAPI.getStats().catch(() => null),
        adminAPI.getUsers().catch(() => []),
        adminAPI.getServices().catch(() => []),
        adminAPI.getOrders().catch(() => []),
        adminAPI.getReviews().catch(() => []),
        paymentAPI.getHeldFunds().catch(() => []),
        adminAPI.getReports().catch(() => []),
        adminAPI.getFlaggedExperts().catch(() => []),
        sportCategoryAPI.getAll().catch(() => []),
        adminAPI.getPlatformStats().catch(() => null),
        adminAPI.getPlatformFeeTransactions().catch(() => []),
        adminAPI.getAIConfig().catch(() => null),
        adminAPI.getAIUsers().catch(() => []),
      ]);
      setData({ stats, users, services, orders, reviews, heldFunds, reports, flagged, sports, platformStats, platformFees, aiConfig, aiUsers });
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  return (
    <AdminDataContext.Provider value={{ data, loading, refresh: load }}>
      {children}
    </AdminDataContext.Provider>
  );
}

export function useAdminData() {
  return useContext(AdminDataContext);
}
