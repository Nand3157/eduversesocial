import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

const LEGACY_STORAGE_KEY = "socialpulse-dashboard-store";

const storage = {
  getItem: (name: string) => {
    const current = window.localStorage.getItem(name);
    if (current !== null) return current;
    // One-time migration from the pre-rename storage key.
    const legacy = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy !== null) {
      window.localStorage.setItem(name, legacy);
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    }
    return legacy;
  },
  setItem: (name: string, value: string) => window.localStorage.setItem(name, value),
  removeItem: (name: string) => window.localStorage.removeItem(name)
};

type DashboardState = {
  mobileNavOpen: boolean;
  sidebarCollapsed: boolean;
  userName: string;
  userRole: string;
  userEmail: string;
  userBio: string;
  setMobileNavOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setProfile: (profile: { name?: string; role?: string; email?: string; bio?: string }) => void;
};

export const useDashboardStore = create<DashboardState>()(
  persist(
    (set) => ({
      mobileNavOpen: false,
      sidebarCollapsed: false,
      userName: "Maya Chen",
      userRole: "Creator Growth Lead",
      userEmail: "learner@eduverse.app",
      userBio: "Scaling social content through AI insights & data.",
      setMobileNavOpen: (mobileNavOpen) => set({ mobileNavOpen }),
      toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setProfile: (profile) =>
        set((state) => ({
          userName: profile.name !== undefined ? profile.name : state.userName,
          userRole: profile.role !== undefined ? profile.role : state.userRole,
          userEmail: profile.email !== undefined ? profile.email : state.userEmail,
          userBio: profile.bio !== undefined ? profile.bio : state.userBio
        }))
    }),
    {
      name: "eduverse-dashboard-store",
      storage: createJSONStorage(() => storage)
    }
  )
);
