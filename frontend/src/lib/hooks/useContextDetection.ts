'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { useAICommandCenter, type PageContext, type ContextAction } from '@/lib/stores/aiCommandCenterStore'
import { 
  Reply, 
  Forward, 
  FileText, 
  Mail, 
  Search,
  Plus,
  Clock,
  Users,
  CheckSquare,
  Calendar,
  Zap,
  Link2,
  CreditCard,
  Settings
} from 'lucide-react'

const getContextualActions = (page: string, selectedItem?: string): ContextAction[] => {
  const actions: ContextAction[] = []
  
  switch (page) {
    case 'email':
      if (selectedItem) {
        actions.push(
          { icon: Reply, label: "Reply to this email", command: `reply:${selectedItem}` },
          { icon: Forward, label: "Forward this email", command: `forward:${selectedItem}` },
          { icon: FileText, label: "Summarize this email", command: `summarize:${selectedItem}` }
        )
      }
      actions.push(
        { icon: Mail, label: "Compose new email", command: "compose" },
        { icon: Search, label: "Search emails", command: "search-emails" }
      )
      break
      
    case 'calendar':
      if (selectedItem) {
        actions.push(
          { icon: Clock, label: "Reschedule event", command: `reschedule:${selectedItem}` },
          { icon: Users, label: "Add attendees", command: `add-attendees:${selectedItem}` }
        )
      }
      actions.push(
        { icon: Plus, label: "Create event", command: "create-event" },
        { icon: Clock, label: "Schedule meeting", command: "schedule-meeting" },
        { icon: Users, label: "Find time with team", command: "find-time" }
      )
      break
      
    case 'tasks':
      if (selectedItem) {
        actions.push(
          { icon: CheckSquare, label: "Mark complete", command: `complete:${selectedItem}` },
          { icon: Clock, label: "Set due date", command: `set-due:${selectedItem}` }
        )
      }
      actions.push(
        { icon: Plus, label: "Create task", command: "create-task" },
        { icon: CheckSquare, label: "View all tasks", command: "view-tasks" },
        { icon: Clock, label: "Set reminder", command: "set-reminder" }
      )
      break
      
    case 'workflows':
      actions.push(
        { icon: Plus, label: "Create workflow", command: "create-workflow" },
        { icon: Zap, label: "Run workflow", command: "run-workflow" },
        { icon: Settings, label: "Configure automation", command: "configure-automation" }
      )
      break
      
    case 'integrations':
      actions.push(
        { icon: Link2, label: "Connect app", command: "connect-app" },
        { icon: Settings, label: "Manage connections", command: "manage-connections" },
        { icon: Plus, label: "Browse integrations", command: "browse-integrations" }
      )
      break
      
    case 'billing':
      actions.push(
        { icon: CreditCard, label: "Update payment", command: "update-payment" },
        { icon: FileText, label: "View invoices", command: "view-invoices" },
        { icon: Settings, label: "Change plan", command: "change-plan" }
      )
      break
      
    case 'dashboard':
    default:
      actions.push(
        { icon: Mail, label: "Check emails", command: "check-emails" },
        { icon: Calendar, label: "View calendar", command: "view-calendar" },
        { icon: CheckSquare, label: "Review tasks", command: "review-tasks" },
        { icon: FileText, label: "Generate report", command: "generate-report" }
      )
      break
  }
  
  return actions
}

const getSelectedItemFromDOM = (): string | undefined => {
  // Look for selected items in the DOM
  const selectedElement = document.querySelector('[data-selected="true"]')
  if (selectedElement) {
    return selectedElement.getAttribute('data-item-id') || undefined
  }
  
  // Check for active/selected classes
  const activeElement = document.querySelector('.selected, .active-item, [aria-selected="true"]')
  if (activeElement) {
    return activeElement.getAttribute('data-id') || 
           activeElement.getAttribute('data-item-id') || 
           activeElement.id || 
           undefined
  }
  
  return undefined
}

const getSelectedItemFromURL = (): string | undefined => {
  if (typeof window === 'undefined') return undefined
  
  const params = new URLSearchParams(window.location.search)
  return params.get('id') || params.get('item') || params.get('selected') || undefined
}

export function useContextDetection() {
  const pathname = usePathname()
  const { setContext } = useAICommandCenter()
  
  useEffect(() => {
    const detectContext = () => {
      // Extract page from pathname
      const pathSegments = pathname.split('/').filter(Boolean)
      let page = 'dashboard'
      
      if (pathSegments.length > 0) {
        if (pathSegments[0] === 'dashboard' && pathSegments[1]) {
          page = pathSegments[1]
        } else if (pathSegments[0] !== 'dashboard') {
          page = pathSegments[0]
        }
      }
      
      // Detect selected items
      const selectedItem = getSelectedItemFromDOM() || getSelectedItemFromURL()
      
      // Get contextual actions
      const availableActions = getContextualActions(page, selectedItem)
      
      // Update context in store
      setContext({
        page: page as PageContext['page'],
        selectedItem,
        availableActions
      })
    }
    
    // Initial detection
    detectContext()
    
    // Set up observers for DOM changes
    const observer = new MutationObserver(() => {
      detectContext()
    })
    
    // Observe changes to attributes and subtree
    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ['data-selected', 'aria-selected', 'class'],
      subtree: true,
      childList: true
    })
    
    // Listen for popstate events (browser navigation)
    window.addEventListener('popstate', detectContext)
    
    // Cleanup
    return () => {
      observer.disconnect()
      window.removeEventListener('popstate', detectContext)
    }
  }, [pathname, setContext])
}