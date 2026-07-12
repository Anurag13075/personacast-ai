import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Host = { name: string; role: string };

export type Project = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  hosts: Host[];
  style: string;
  sources: { id: string; name: string; kind: "pdf" | "image"; pages?: number; text?: string; dataUrl?: string }[];
  script: string;
  thumbnails: string[];
  selectedThumbnail: number;
  durationSec: number;
};

type State = {
  projects: Project[];
  currentId: string | null;
  createProject: (title?: string) => string;
  setCurrent: (id: string) => void;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
};

const emptyProject = (title = "Untitled Project"): Project => ({
  id: crypto.randomUUID(),
  title,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  hosts: [
    { name: "Alex", role: "Co-Host" },
    { name: "Ben", role: "Expert" },
  ],
  style: "Engaging, curious, ~4 minutes, conversational tone.",
  sources: [],
  script: "",
  thumbnails: [],
  selectedThumbnail: 0,
  durationSec: 0,
});

export const useStore = create<State>()(
  persist(
    (set) => ({
      projects: [],
      currentId: null,
      createProject: (title) => {
        const p = emptyProject(title);
        set((s) => ({ projects: [p, ...s.projects], currentId: p.id }));
        return p.id;
      },
      setCurrent: (id) => set({ currentId: id }),
      updateProject: (id, patch) =>
        set((s) => ({
          projects: s.projects.map((p) => (p.id === id ? { ...p, ...patch, updatedAt: Date.now() } : p)),
        })),
      deleteProject: (id) =>
        set((s) => ({
          projects: s.projects.filter((p) => p.id !== id),
          currentId: s.currentId === id ? null : s.currentId,
        })),
    }),
    { name: "heva-ai-store" }
  )
);
