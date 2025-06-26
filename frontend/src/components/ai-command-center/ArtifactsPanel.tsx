'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useAICommandCenter, type ArtifactItem, type PendingAction } from '@/lib/stores/aiCommandCenterStore'
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  FileText,
  Mail,
  Calendar,
  CheckSquare,
  Link,
  Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils/cn'

const artifactIcons = {
  email: Mail,
  calendar: Calendar,
  task: CheckSquare,
  document: FileText,
  link: Link,
  default: AlertCircle
}

function ArtifactRenderer({ artifact }: { artifact: ArtifactItem }) {
  const Icon = artifactIcons[artifact.metadata?.type as keyof typeof artifactIcons] || artifactIcons.default
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="p-4 liquid-glass rounded-xl shadow-lg"
    >
      <div className="flex items-start space-x-3">
        <div className="p-2 liquid-glass-accent rounded-lg">
          <Icon className="w-4 h-4 text-gray-700 dark:text-gray-300" />
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-gray-900 dark:text-white mb-1">
            {artifact.title}
          </h4>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {typeof artifact.content === 'string' ? (
              <p>{artifact.content}</p>
            ) : (
              <pre className="whitespace-pre-wrap font-mono text-xs liquid-glass-subtle p-2 rounded-lg mt-2">
                {JSON.stringify(artifact.content, null, 2)}
              </pre>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function ActionConfirmation({ action }: { action: PendingAction }) {
  const { updateActionStatus } = useAICommandCenter()
  
  const handleConfirm = () => {
    updateActionStatus(action.id, 'confirmed')
    // TODO: Execute the action
  }
  
  const handleCancel = () => {
    updateActionStatus(action.id, 'cancelled')
  }
  
  if (action.status !== 'pending') {
    return null
  }
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="p-4 liquid-glass-accent rounded-xl shadow-lg border border-amber-200/50 dark:border-amber-600/30"
    >
      <div className="flex items-center space-x-2 mb-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        <h4 className="font-medium text-gray-900 dark:text-white">
          Action Required
        </h4>
      </div>
      
      <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
        {action.description}
      </p>
      
      {Boolean(action.data && typeof action.data === 'object') && (
        <div className="mb-4 p-3 liquid-glass-subtle rounded-lg">
          <pre className="text-xs font-mono text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
            {JSON.stringify(action.data, null, 2)}
          </pre>
        </div>
      )}
      
      <div className="flex space-x-2">
        <button
          onClick={handleConfirm}
          className="flex-1 px-4 py-2 liquid-glass text-gray-900 dark:text-gray-100 rounded-lg shadow-lg hover:liquid-glass-accent hover:shadow-2xl transition-all duration-200 font-medium text-sm"
        >
          <CheckCircle className="w-4 h-4 inline mr-1" />
          Confirm
        </button>
        <button
          onClick={handleCancel}
          className="flex-1 px-4 py-2 liquid-glass-subtle text-gray-600 dark:text-gray-400 rounded-lg hover:liquid-glass hover:text-gray-900 dark:hover:text-gray-100 transition-all duration-200 font-medium text-sm"
        >
          <XCircle className="w-4 h-4 inline mr-1" />
          Cancel
        </button>
      </div>
    </motion.div>
  )
}

export function ArtifactsPanel() {
  const { artifacts, pendingActions, messages, isProcessing } = useAICommandCenter()
  
  // Show messages if no artifacts
  const showMessages = artifacts.length === 0 && messages.length > 0
  
  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          AI Assistant
        </h3>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <Loader2 className="w-4 h-4 text-gray-500 dark:text-gray-400 animate-spin" />
          </motion.div>
        )}
      </div>
      
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
        <AnimatePresence>
          {/* Pending actions (highest priority) */}
          {pendingActions.map((action) => (
            <ActionConfirmation key={action.id} action={action} />
          ))}
          
          {/* Artifacts */}
          {artifacts.map((artifact) => (
            <ArtifactRenderer key={artifact.id} artifact={artifact} />
          ))}
          
          {/* Messages (if no artifacts) */}
          {showMessages && messages.map((message) => (
            <motion.div
              key={message.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={cn(
                "p-4 rounded-xl",
                message.role === 'user'
                  ? "ml-8 liquid-glass-accent text-gray-900 dark:text-gray-100"
                  : "mr-8"
              )}
            >
              <p className={cn(
                "text-sm",
                message.role === 'user' 
                  ? "text-gray-900 dark:text-gray-100" 
                  : "text-gray-700 dark:text-gray-300"
              )}>
                {message.content}
              </p>
              <p className={cn(
                "text-xs mt-1",
                message.role === 'user'
                  ? "text-gray-600 dark:text-gray-400"
                  : "text-gray-500 dark:text-gray-500"
              )}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </p>
            </motion.div>
          ))}
          
          {/* Empty state */}
          {artifacts.length === 0 && pendingActions.length === 0 && messages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full text-center px-4"
            >
              <div className="p-4 liquid-glass-subtle rounded-full mb-4">
                <FileText className="w-8 h-8 text-gray-400 dark:text-gray-600" />
              </div>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                No responses yet
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Ask Aurelius anything and responses will appear here
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}