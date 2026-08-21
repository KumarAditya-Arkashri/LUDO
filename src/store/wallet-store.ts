import { create } from "zustand";
import type { Transaction, Wallets } from "@/types";
import { api } from "@/lib/api";

interface WalletState {
  wallets: Wallets;
  transactions: Transaction[];
  isLoading: boolean;
  fetchWallet: () => Promise<void>;
  fetchHistory: () => Promise<void>;
  requestDeposit: (amount: number, utr: string) => Promise<void>;
  requestWithdraw: (amount: number, upiId: string) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set, get) => ({
  wallets: { main: 0, winning: 0, referral: 0 },
  transactions: [],
  isLoading: false,

  fetchWallet: async () => {
    try {
      const { data } = await api.get("/wallet/summary");
      set({
        wallets: {
          main: Number(data.MAIN || 0),
          winning: Number(data.WINNING || 0),
          referral: Number(data.REFERRAL || 0),
        },
      });
    } catch (error) {
      console.error("Failed to fetch wallet", error);
    }
  },

  fetchHistory: async () => {
    try {
      set({ isLoading: true });
      const { data } = await api.get("/wallet/history");
      set({ transactions: data });
    } catch (error) {
      console.error("Failed to fetch history", error);
    } finally {
      set({ isLoading: false });
    }
  },

  requestDeposit: async (amount, utr) => {
    await api.post("/deposit", { amount, utr });
    get().fetchHistory();
  },

  requestWithdraw: async (amount, upiId) => {
    await api.post("/withdrawal", { amount, upiId });
    get().fetchWallet();
    get().fetchHistory();
  },
}));
