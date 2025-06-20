'use client'

import { create } from 'zustand'

interface CommandStore {
  isOpen: boolean
  isProcessing: boolean
  showQuickActions: boolean
  activeCommand: string | null
  recentCommands: string[]
  
  // Actions
  openFAB: () => void
  closeFAB: () => void
  toggleQuickActions: () => void
  setProcessing: (processing: boolean) => void
  setActiveCommand: (command: string | null) => void
  addRecentCommand: (command: string) => void
  clearRecentCommands: () => void
}

export const useCommandStore = create<CommandStore>((set, get) => ({
  isOpen: false,
  isProcessing: false,
  showQuickActions: false,
  activeCommand: null,
  recentCommands: [],

  openFAB: () => set({ isOpen: true }),
  closeFAB: () => set({ isOpen: false, showQuickActions: false }),
  
  toggleQuickActions: () => {
    const { showQuickActions } = get()
    set({ showQuickActions: !showQuickActions })
  },
  
  setProcessing: (processing: boolean) => set({ isProcessing: processing }),
  
  setActiveCommand: (command: string | null) => set({ activeCommand: command }),
  
  addRecentCommand: (command: string) => {
    const { recentCommands } = get()
    const newCommands = [command, ...recentCommands.filter(c => c !== command)].slice(0, 5)
    set({ recentCommands: newCommands })
  },
  
  clearRecentCommands: () => set({ recentCommands: [] }),
}))