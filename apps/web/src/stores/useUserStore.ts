import { create } from "zustand";
import { persist } from "zustand/middleware";
import { api } from "../lib/api";

interface User {
  id: string;
  email: string;
  name: string;
}

interface UserState {
  token: string | null;
  user: User | null;
  balance: number | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: { name: string; email: string; password: string }) => Promise<void>;
  setBalance: (balance: number) => void;
  fetchBalance: () => Promise<void>;
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      balance: null,
      isLoading: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true });
        const res = await api.post<{ token: string; user: User }>("/api/auth/login", { email, password });
        set({ token: res.token });
        const balanceRes = await api.get<{ amount: number }>("/api/balance");
        set({ user: res.user, balance: balanceRes.amount, isLoading: false });
      },

      logout: () => {
        set({ token: null, user: null, balance: null, isLoading: false });
      },

      register: async (data: { name: string; email: string; password: string }) => {
        set({ isLoading: true });

        const res = await api.post<{ token: string; user: User }>("/api/auth/register", data);

        set({ token: res.token });

        const balanceRes = await api.get<{ amount: number }>("/api/balance");

        set({
          user: res.user,
          balance: balanceRes.amount,
          isLoading: false,
        });
      },

      setBalance: (balance: number) => set({ balance }),

      fetchBalance: async () => {
        const res = await api.get<{ amount: number }>("/api/balance");
        set({ balance: res.amount });
      },
    }),
    {
      name: "user-store",
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        balance: state.balance,
        isLoading: state.isLoading,
      }),
    }
  )
);
