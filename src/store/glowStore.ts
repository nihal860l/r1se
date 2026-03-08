import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface GlowState {
  glowEnabled: boolean;
  setGlowEnabled: (enabled: boolean) => void;
  toggleGlow: () => void;
}

export const useGlowStore = create<GlowState>()(
  persist(
    (set) => ({
      glowEnabled: true,
      setGlowEnabled: (enabled) => set({ glowEnabled: enabled }),
      toggleGlow: () => set((state) => ({ glowEnabled: !state.glowEnabled })),
    }),
    {
      name: 'r1se-glow-settings',
    }
  )
);
