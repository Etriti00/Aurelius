/**
 * Lazy-loaded components for route-based code splitting
 * Optimizes bundle size by loading components only when needed
 */

import React, { Suspense } from 'react';

// Loading components with consistent styling
const ComponentSkeleton = React.memo(({ height = "h-64" }: { height?: string }) => (
  <div className={`liquid-glass-accent rounded-2xl sm:rounded-3xl p-6 animate-pulse ${height}`}>
    <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
    <div className="relative space-y-4">
      <div className="h-4 bg-gray-200/60 dark:bg-gray-700/60 rounded w-1/3"></div>
      <div className="h-8 bg-gray-200/60 dark:bg-gray-700/60 rounded w-2/3"></div>
      <div className="space-y-2">
        <div className="h-3 bg-gray-200/60 dark:bg-gray-700/60 rounded"></div>
        <div className="h-3 bg-gray-200/60 dark:bg-gray-700/60 rounded w-4/5"></div>
        <div className="h-3 bg-gray-200/60 dark:bg-gray-700/60 rounded w-3/4"></div>
      </div>
    </div>
  </div>
));

ComponentSkeleton.displayName = 'ComponentSkeleton';

const KanbanSkeleton = React.memo(() => (
  <div className="liquid-glass-accent rounded-2xl sm:rounded-3xl p-6 animate-pulse h-96">
    <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
    <div className="relative">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="h-4 bg-gray-200/60 dark:bg-gray-700/60 rounded w-20"></div>
            <div className="space-y-2">
              {Array.from({ length: 2 }).map((_, j) => (
                <div key={j} className="h-16 bg-gray-200/60 dark:bg-gray-700/60 rounded"></div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  </div>
));

KanbanSkeleton.displayName = 'KanbanSkeleton';

// Lazy load heavy dashboard components
const LazyTasksKanban = React.lazy(() => 
  import('@/components/dashboard/TasksKanban').then(module => ({ 
    default: module.TasksKanban 
  }))
);

const LazyCalendarWidget = React.lazy(() => 
  import('@/components/dashboard/CalendarWidget').then(module => ({ 
    default: module.CalendarWidget 
  }))
);

const LazyInboxWidget = React.lazy(() => 
  import('@/components/dashboard/InboxWidget').then(module => ({ 
    default: module.InboxWidget 
  }))
);

const LazySuggestionsPanel = React.lazy(() => 
  import('@/components/dashboard/SuggestionsPanel').then(module => ({ 
    default: module.SuggestionsPanel 
  }))
);

const LazyFloatingActionButton = React.lazy(() => 
  import('@/components/dashboard/FloatingActionButton').then(module => ({ 
    default: module.FloatingActionButton 
  }))
);

// Lazy load heavy 3D component
const LazyBrain3D = React.lazy(() => 
  import('@/components/landing/Brain3D').then(module => ({ 
    default: module.Brain3D 
  }))
);

// Error boundary for lazy components
interface LazyErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class LazyErrorBoundary extends React.Component<
  { children: React.ReactNode },
  LazyErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): LazyErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy component loading error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="liquid-glass-accent rounded-2xl sm:rounded-3xl p-6 h-64">
          <div className="absolute inset-0 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-white/10 to-transparent pointer-events-none" />
          <div className="relative flex items-center justify-center h-full">
            <div className="text-center text-gray-500 dark:text-gray-400">
              <p className="text-sm">Component failed to load</p>
              <button 
                onClick={() => this.setState({ hasError: false })}
                className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                Try again
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Wrapper components with error boundaries and loading states
export const TasksKanban = React.memo(() => (
  <LazyErrorBoundary>
    <Suspense fallback={<KanbanSkeleton />}>
      <LazyTasksKanban />
    </Suspense>
  </LazyErrorBoundary>
));

export const CalendarWidget = React.memo(() => (
  <LazyErrorBoundary>
    <Suspense fallback={<ComponentSkeleton height="h-80" />}>
      <LazyCalendarWidget />
    </Suspense>
  </LazyErrorBoundary>
));

export const InboxWidget = React.memo(() => (
  <LazyErrorBoundary>
    <Suspense fallback={<ComponentSkeleton height="h-96" />}>
      <LazyInboxWidget />
    </Suspense>
  </LazyErrorBoundary>
));

export const SuggestionsPanel = React.memo(() => (
  <LazyErrorBoundary>
    <Suspense fallback={<ComponentSkeleton height="h-64" />}>
      <LazySuggestionsPanel />
    </Suspense>
  </LazyErrorBoundary>
));

export const FloatingActionButton = React.memo(() => (
  <LazyErrorBoundary>
    <Suspense fallback={null}>
      <LazyFloatingActionButton />
    </Suspense>
  </LazyErrorBoundary>
));

export const Brain3D = React.memo(() => (
  <LazyErrorBoundary>
    <Suspense fallback={
      <div className="w-full h-full flex items-center justify-center">
        <div className="animate-pulse">
          <div className="w-40 h-40 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-xl"></div>
        </div>
      </div>
    }>
      <LazyBrain3D />
    </Suspense>
  </LazyErrorBoundary>
));

// Set display names
TasksKanban.displayName = 'LazyTasksKanban';
CalendarWidget.displayName = 'LazyCalendarWidget';
InboxWidget.displayName = 'LazyInboxWidget';
SuggestionsPanel.displayName = 'LazySuggestionsPanel';
FloatingActionButton.displayName = 'LazyFloatingActionButton';
Brain3D.displayName = 'LazyBrain3D';