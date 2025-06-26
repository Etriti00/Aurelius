'use client'

import React from 'react'
import { create } from 'zustand'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  artifacts?: ArtifactItem[]
}

export interface ArtifactItem {
  id: string
  type: 'confirmation' | 'preview' | 'result' | 'action'
  title: string
  content: unknown
  metadata?: Record<string, unknown>
}

export interface PendingAction {
  id: string
  type: string
  description: string
  data: unknown
  status: 'pending' | 'confirmed' | 'cancelled'
}

export interface PageContext {
  page: 'dashboard' | 'calendar' | 'email' | 'tasks' | 'workflows' | 'integrations' | 'billing' | 'settings'
  selectedItem?: string
  availableActions: ContextAction[]
}

export interface ContextAction {
  icon: React.ComponentType<{ className?: string }>
  label: string
  command: string
}

interface AICommandCenterState {
  isOpen: boolean
  currentContext: PageContext | null
  messages: ChatMessage[]
  artifacts: ArtifactItem[]
  pendingActions: PendingAction[]
  isProcessing: boolean
  
  // Actions
  toggle: () => void
  open: () => void
  close: () => void
  setContext: (context: PageContext) => void
  addMessage: (message: ChatMessage) => void
  addArtifact: (artifact: ArtifactItem) => void
  addPendingAction: (action: PendingAction) => void
  updateActionStatus: (actionId: string, status: PendingAction['status']) => void
  setProcessing: (processing: boolean) => void
  clearMessages: () => void
}

export const useAICommandCenter = create<AICommandCenterState>((set) => ({
  isOpen: false,
  currentContext: null,
  messages: [],
  artifacts: [],
  pendingActions: [],
  isProcessing: false,

  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
  
  open: () => set({ isOpen: true }),
  
  close: () => set({ isOpen: false }),
  
  setContext: (context: PageContext) => set({ currentContext: context }),
  
  addMessage: (message: ChatMessage) => set((state) => ({
    messages: [...state.messages, message]
  })),
  
  addArtifact: (artifact: ArtifactItem) => set((state) => ({
    artifacts: [...state.artifacts, artifact]
  })),
  
  addPendingAction: (action: PendingAction) => set((state) => ({
    pendingActions: [...state.pendingActions, action]
  })),
  
  updateActionStatus: (actionId: string, status: PendingAction['status']) => set((state) => ({
    pendingActions: state.pendingActions.map(action =>
      action.id === actionId ? { ...action, status } : action
    )
  })),
  
  setProcessing: (processing: boolean) => set({ isProcessing: processing }),
  
  clearMessages: () => set({ messages: [], artifacts: [], pendingActions: [] }),
}))