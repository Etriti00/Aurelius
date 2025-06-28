'use client'

import { motion } from 'framer-motion'
import { useState, useMemo } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { 
  Search, 
  ArrowRight, 
  CheckCircle,
  Zap
} from 'lucide-react'
import { Navbar } from '@/components/landing/Navbar'
import { Footer } from '@/components/landing/Footer'

// Helper function to get the correct logo URL
function getLogoUrl(slug: string): string {
  // Custom mappings for icons that need specific handling
  const iconMappings: { [key: string]: string } = {
    // Use gilbarbara/logos for these
    'monday': 'https://cdn.svgporn.com/logos/monday-icon.svg',
    'linear': 'https://cdn.svgporn.com/logos/linear-icon.svg',
    'amplitude': 'https://cdn.svgporn.com/logos/amplitude-icon.svg',
    'datadog': 'https://cdn.svgporn.com/logos/datadog.svg',
    'segment': 'https://cdn.svgporn.com/logos/segment-icon.svg',
    'google-analytics': 'https://cdn.svgporn.com/logos/google-analytics.svg',
    'google-keep': 'https://cdn.svgporn.com/logos/google-keep.svg',
    'microsoft': 'https://cdn.svgporn.com/logos/microsoft-icon.svg',
    
    // Map problematic slugs to working alternatives
    'googletasks': 'https://cdn.simpleicons.org/google',
    'googleforms': 'https://cdn.simpleicons.org/google',
    'googleslides': 'https://cdn.simpleicons.org/google',
    'caldotcom': 'https://cdn.simpleicons.org/calendly',
    'bear': 'https://cdn.simpleicons.org/apple',
    'craft': 'https://cdn.simpleicons.org/apple',
    'anydotdo': 'https://cdn.simpleicons.org/todoist',
    'pipedrive': 'https://cdn.simpleicons.org/salesforce',
    'copper': 'https://cdn.simpleicons.org/salesforce',
    'freshworks': 'https://cdn.simpleicons.org/zendesk',
    'freshsales': 'https://cdn.simpleicons.org/salesforce',
    'freshdesk': 'https://cdn.simpleicons.org/zendesk',
    'drift': 'https://cdn.simpleicons.org/intercom',
    'livechat': 'https://cdn.simpleicons.org/intercom',
    'helpscout': 'https://cdn.simpleicons.org/zendesk',
    'wrike': 'https://cdn.simpleicons.org/asana',
    'smartsheet': 'https://cdn.simpleicons.org/airtable',
    'height': 'https://cdn.simpleicons.org/notion',
    'plaid': 'https://cdn.simpleicons.org/stripe',
    'freshbooks': 'https://cdn.simpleicons.org/quickbooks',
    'wave': 'https://cdn.simpleicons.org/quickbooks',
    'make': 'https://cdn.simpleicons.org/zapier',
    'workato': 'https://cdn.simpleicons.org/zapier',
    'bigcommerce': 'https://cdn.simpleicons.org/shopify',
  }
  
  // Check if we have a custom mapping
  if (iconMappings[slug]) {
    return iconMappings[slug]
  }
  
  // Default to Simple Icons
  return `https://cdn.simpleicons.org/${slug}`
}

// All 118 integrations data
const ALL_INTEGRATIONS = [
  // GOOGLE WORKSPACE SUITE (12)
  { id: 1, name: 'Gmail', slug: 'gmail', category: 'Google Workspace', description: 'Intelligent email management with AI-powered sorting, drafting, and responses.', isPopular: true, comingSoon: false },
  { id: 2, name: 'Google Calendar', slug: 'googlecalendar', category: 'Google Workspace', description: 'Smart scheduling, meeting prep, and calendar optimization.', isPopular: true, comingSoon: false },
  { id: 3, name: 'Google Drive', slug: 'googledrive', category: 'Google Workspace', description: 'Cloud storage and document collaboration.', isPopular: true, comingSoon: false },
  { id: 4, name: 'Google Tasks', slug: 'googletasks', category: 'Google Workspace', description: 'Task management and to-do list automation.', isPopular: false, comingSoon: false },
  { id: 5, name: 'Google Contacts', slug: 'google', category: 'Google Workspace', description: 'Contact management and organization.', isPopular: false, comingSoon: false },
  { id: 6, name: 'Google Keep', slug: 'google-keep', category: 'Google Workspace', description: 'Note-taking and reminder automation.', isPopular: false, comingSoon: false },
  { id: 7, name: 'Google Meet', slug: 'googlemeet', category: 'Google Workspace', description: 'Video conferencing and meeting automation.', isPopular: true, comingSoon: false },
  { id: 8, name: 'Google Chat', slug: 'googlechat', category: 'Google Workspace', description: 'Team messaging and collaboration.', isPopular: false, comingSoon: false },
  { id: 9, name: 'Google Forms', slug: 'googleforms', category: 'Google Workspace', description: 'Form creation and response automation.', isPopular: false, comingSoon: false },
  { id: 10, name: 'Google Sheets', slug: 'googlesheets', category: 'Google Workspace', description: 'Spreadsheet automation and data analysis.', isPopular: true, comingSoon: false },
  { id: 11, name: 'Google Docs', slug: 'googledocs', category: 'Google Workspace', description: 'Collaborative document editing and automation.', isPopular: true, comingSoon: false },
  { id: 12, name: 'Google Slides', slug: 'googleslides', category: 'Google Workspace', description: 'Presentation creation and automation.', isPopular: false, comingSoon: false },

  // MICROSOFT 365 SUITE (12) - Using Microsoft logo from gilbarbara for better branding
  { id: 13, name: 'Microsoft Outlook', slug: 'microsoft', category: 'Microsoft 365', description: 'Email management and calendar integration.', isPopular: true, comingSoon: false },
  { id: 14, name: 'Microsoft Teams', slug: 'microsoft', category: 'Microsoft 365', description: 'Team collaboration and communication platform.', isPopular: true, comingSoon: false },
  { id: 15, name: 'OneDrive', slug: 'microsoft', category: 'Microsoft 365', description: 'Cloud storage and file synchronization.', isPopular: true, comingSoon: false },
  { id: 16, name: 'SharePoint', slug: 'microsoft', category: 'Microsoft 365', description: 'Document management and collaboration.', isPopular: false, comingSoon: false },
  { id: 17, name: 'Microsoft Planner', slug: 'microsoft', category: 'Microsoft 365', description: 'Task and project management.', isPopular: false, comingSoon: false },
  { id: 18, name: 'Microsoft To Do', slug: 'microsoft', category: 'Microsoft 365', description: 'Personal task management and reminders.', isPopular: false, comingSoon: false },
  { id: 19, name: 'Power Automate', slug: 'microsoft', category: 'Microsoft 365', description: 'Workflow automation platform.', isPopular: false, comingSoon: false },
  { id: 20, name: 'Microsoft Excel', slug: 'microsoft', category: 'Microsoft 365', description: 'Spreadsheet automation and data analysis.', isPopular: true, comingSoon: false },
  { id: 21, name: 'Microsoft Word', slug: 'microsoft', category: 'Microsoft 365', description: 'Document processing and automation.', isPopular: false, comingSoon: false },
  { id: 22, name: 'PowerPoint', slug: 'microsoft', category: 'Microsoft 365', description: 'Presentation creation and automation.', isPopular: false, comingSoon: false },
  { id: 23, name: 'Dynamics 365', slug: 'microsoft', category: 'Microsoft 365', description: 'Business applications and CRM.', isPopular: false, comingSoon: false },
  { id: 24, name: 'Azure DevOps', slug: 'microsoft', category: 'Microsoft 365', description: 'DevOps and project management platform.', isPopular: false, comingSoon: false },

  // COMMUNICATION PLATFORMS (8)
  { id: 25, name: 'Slack', slug: 'slack', category: 'Communication', description: 'Team communication and workflow automation.', isPopular: true, comingSoon: false },
  { id: 26, name: 'Discord', slug: 'discord', category: 'Communication', description: 'Community and team communication platform.', isPopular: false, comingSoon: false },
  { id: 27, name: 'Zoom', slug: 'zoom', category: 'Communication', description: 'Video conferencing and webinar platform.', isPopular: true, comingSoon: false },
  { id: 28, name: 'Telegram', slug: 'telegram', category: 'Communication', description: 'Secure messaging and bot automation.', isPopular: false, comingSoon: false },
  { id: 29, name: 'WhatsApp Business', slug: 'whatsapp', category: 'Communication', description: 'Business messaging and customer service.', isPopular: false, comingSoon: false },
  { id: 30, name: 'Webex', slug: 'webex', category: 'Communication', description: 'Enterprise video conferencing and collaboration.', isPopular: false, comingSoon: false },
  { id: 31, name: 'Loom', slug: 'loom', category: 'Communication', description: 'Screen recording and video messaging.', isPopular: false, comingSoon: false },
  { id: 32, name: 'Teams Phone', slug: 'microsoft', category: 'Communication', description: 'Cloud-based phone system integration.', isPopular: false, comingSoon: false },

  // PROJECT MANAGEMENT (11)
  { id: 33, name: 'Jira', slug: 'jira', category: 'Project Management', description: 'Issue tracking and agile project management.', isPopular: true, comingSoon: false },
  { id: 34, name: 'Trello', slug: 'trello', category: 'Project Management', description: 'Kanban board automation and project organization.', isPopular: true, comingSoon: false },
  { id: 35, name: 'Asana', slug: 'asana', category: 'Project Management', description: 'Team project management and task automation.', isPopular: true, comingSoon: false },
  { id: 36, name: 'Linear', slug: 'linear', category: 'Project Management', description: 'Modern issue tracking for software teams.', isPopular: false, comingSoon: false },
  { id: 37, name: 'ClickUp', slug: 'clickup', category: 'Project Management', description: 'All-in-one productivity and project management.', isPopular: false, comingSoon: false },
  { id: 38, name: 'Monday.com', slug: 'monday', category: 'Project Management', description: 'Work management and team collaboration platform.', isPopular: false, comingSoon: false },
  { id: 39, name: 'Basecamp', slug: 'basecamp', category: 'Project Management', description: 'Project management and team collaboration.', isPopular: false, comingSoon: false },
  { id: 40, name: 'Wrike', slug: 'wrike', category: 'Project Management', description: 'Professional project management and collaboration.', isPopular: false, comingSoon: false },
  { id: 41, name: 'Smartsheet', slug: 'smartsheet', category: 'Project Management', description: 'Enterprise project management and automation.', isPopular: false, comingSoon: false },
  { id: 42, name: 'Airtable', slug: 'airtable', category: 'Project Management', description: 'Database and project management hybrid platform.', isPopular: false, comingSoon: false },
  { id: 43, name: 'Height', slug: 'height', category: 'Project Management', description: 'Autonomous project management with AI.', isPopular: false, comingSoon: false },

  // CRM & SALES (6)
  { id: 44, name: 'Salesforce', slug: 'salesforce', category: 'CRM & Sales', description: 'Enterprise CRM automation and lead management.', isPopular: true, comingSoon: false },
  { id: 45, name: 'HubSpot', slug: 'hubspot', category: 'CRM & Sales', description: 'Inbound marketing and sales automation.', isPopular: true, comingSoon: false },
  { id: 46, name: 'Pipedrive', slug: 'pipedrive', category: 'CRM & Sales', description: 'Sales pipeline management and automation.', isPopular: false, comingSoon: false },
  { id: 47, name: 'Zoho CRM', slug: 'zoho', category: 'CRM & Sales', description: 'Comprehensive CRM and business automation.', isPopular: false, comingSoon: false },
  { id: 48, name: 'Freshsales', slug: 'freshworks', category: 'CRM & Sales', description: 'Modern CRM for sales teams.', isPopular: false, comingSoon: false },
  { id: 49, name: 'Copper', slug: 'copper', category: 'CRM & Sales', description: 'Google Workspace-native CRM solution.', isPopular: false, comingSoon: false },

  // DEVELOPER TOOLS (8)
  { id: 50, name: 'GitHub', slug: 'github', category: 'Developer Tools', description: 'Code repository management and automation.', isPopular: true, comingSoon: false },
  { id: 51, name: 'GitLab', slug: 'gitlab', category: 'Developer Tools', description: 'DevOps platform and code management.', isPopular: false, comingSoon: false },
  { id: 52, name: 'Bitbucket', slug: 'bitbucket', category: 'Developer Tools', description: 'Git code management and CI/CD.', isPopular: false, comingSoon: false },
  { id: 53, name: 'Jenkins', slug: 'jenkins', category: 'Developer Tools', description: 'Continuous integration and deployment.', isPopular: false, comingSoon: false },
  { id: 54, name: 'CircleCI', slug: 'circleci', category: 'Developer Tools', description: 'Cloud-based CI/CD platform.', isPopular: false, comingSoon: false },
  { id: 55, name: 'Vercel', slug: 'vercel', category: 'Developer Tools', description: 'Frontend deployment and hosting platform.', isPopular: false, comingSoon: false },
  { id: 56, name: 'Netlify', slug: 'netlify', category: 'Developer Tools', description: 'Modern web development platform.', isPopular: false, comingSoon: false },
  { id: 57, name: 'Docker Hub', slug: 'docker', category: 'Developer Tools', description: 'Container registry and deployment automation.', isPopular: false, comingSoon: false },

  // PRODUCTIVITY & NOTE-TAKING (11)
  { id: 58, name: 'Notion', slug: 'notion', category: 'Productivity', description: 'All-in-one workspace for notes, tasks, and projects.', isPopular: true, comingSoon: false },
  { id: 59, name: 'Todoist', slug: 'todoist', category: 'Productivity', description: 'Task management and productivity automation.', isPopular: false, comingSoon: false },
  { id: 60, name: 'Obsidian', slug: 'obsidian', category: 'Productivity', description: 'Knowledge management and note-taking.', isPopular: false, comingSoon: false },
  { id: 61, name: 'Evernote', slug: 'evernote', category: 'Productivity', description: 'Note-taking and document organization.', isPopular: false, comingSoon: false },
  { id: 62, name: 'OneNote', slug: 'microsoft', category: 'Productivity', description: 'Digital notebook and note-taking.', isPopular: false, comingSoon: false },
  { id: 63, name: 'Roam Research', slug: 'roamresearch', category: 'Productivity', description: 'Networked thought and research tool.', isPopular: false, comingSoon: false },
  { id: 64, name: 'Bear', slug: 'bear', category: 'Productivity', description: 'Beautiful writing app for notes and prose.', isPopular: false, comingSoon: false },
  { id: 65, name: 'Apple Notes', slug: 'apple', category: 'Productivity', description: 'Simple note-taking and synchronization.', isPopular: false, comingSoon: false },
  { id: 66, name: 'Craft', slug: 'craft', category: 'Productivity', description: 'Structured writing and note-taking.', isPopular: false, comingSoon: false },
  { id: 67, name: 'Apple Reminders', slug: 'apple', category: 'Productivity', description: 'Task and reminder management.', isPopular: false, comingSoon: false },
  { id: 68, name: 'Apple Mail', slug: 'apple', category: 'Productivity', description: 'Email client integration and automation.', isPopular: false, comingSoon: false },

  // CALENDAR & SCHEDULING (5)
  { id: 69, name: 'Apple Calendar', slug: 'apple', category: 'Calendar & Scheduling', description: 'Calendar management and event automation.', isPopular: false, comingSoon: false },
  { id: 70, name: 'Calendly', slug: 'calendly', category: 'Calendar & Scheduling', description: 'Automated scheduling and meeting coordination.', isPopular: true, comingSoon: false },
  { id: 71, name: 'Cal.com', slug: 'caldotcom', category: 'Calendar & Scheduling', description: 'Open-source scheduling platform.', isPopular: false, comingSoon: false },
  { id: 72, name: 'Fantastical', slug: 'apple', category: 'Calendar & Scheduling', description: 'Premium calendar and task management.', isPopular: false, comingSoon: false },
  { id: 73, name: 'Any.do Cal', slug: 'anydotdo', category: 'Calendar & Scheduling', description: 'Calendar and task management integration.', isPopular: false, comingSoon: false },

  // FINANCE & ACCOUNTING (8)
  { id: 74, name: 'Stripe', slug: 'stripe', category: 'Finance & Accounting', description: 'Payment processing and subscription management.', isPopular: true, comingSoon: false },
  { id: 75, name: 'QuickBooks', slug: 'quickbooks', category: 'Finance & Accounting', description: 'Accounting and financial management.', isPopular: false, comingSoon: false },
  { id: 76, name: 'Xero', slug: 'xero', category: 'Finance & Accounting', description: 'Cloud-based accounting software.', isPopular: false, comingSoon: false },
  { id: 77, name: 'PayPal', slug: 'paypal', category: 'Finance & Accounting', description: 'Online payment and money transfer automation.', isPopular: false, comingSoon: false },
  { id: 78, name: 'Square', slug: 'square', category: 'Finance & Accounting', description: 'Point of sale and payment processing.', isPopular: false, comingSoon: false },
  { id: 79, name: 'Plaid', slug: 'plaid', category: 'Finance & Accounting', description: 'Financial data connectivity and APIs.', isPopular: false, comingSoon: false },
  { id: 80, name: 'FreshBooks', slug: 'freshbooks', category: 'Finance & Accounting', description: 'Invoicing and accounting for small business.', isPopular: false, comingSoon: false },
  { id: 81, name: 'Wave', slug: 'wave', category: 'Finance & Accounting', description: 'Free accounting software for small business.', isPopular: false, comingSoon: false },

  // CUSTOMER SUPPORT (6)
  { id: 82, name: 'Zendesk', slug: 'zendesk', category: 'Customer Support', description: 'Customer service and support platform.', isPopular: true, comingSoon: false },
  { id: 83, name: 'Intercom', slug: 'intercom', category: 'Customer Support', description: 'Customer messaging and support automation.', isPopular: false, comingSoon: false },
  { id: 84, name: 'Freshdesk', slug: 'freshworks', category: 'Customer Support', description: 'Customer support and helpdesk solution.', isPopular: false, comingSoon: false },
  { id: 85, name: 'Help Scout', slug: 'helpscout', category: 'Customer Support', description: 'Customer support and knowledge base.', isPopular: false, comingSoon: false },
  { id: 86, name: 'Drift', slug: 'drift', category: 'Customer Support', description: 'Conversational marketing and sales platform.', isPopular: false, comingSoon: false },
  { id: 87, name: 'LiveChat', slug: 'livechat', category: 'Customer Support', description: 'Live chat and customer engagement.', isPopular: false, comingSoon: false },

  // AUTOMATION PLATFORMS (5)
  { id: 88, name: 'Zapier', slug: 'zapier', category: 'Automation', description: 'Workflow automation between apps.', isPopular: true, comingSoon: false },
  { id: 89, name: 'Make', slug: 'make', category: 'Automation', description: 'Visual platform for automation workflows.', isPopular: false, comingSoon: false },
  { id: 90, name: 'IFTTT', slug: 'ifttt', category: 'Automation', description: 'Simple automation for everyday tasks.', isPopular: false, comingSoon: false },
  { id: 91, name: 'n8n', slug: 'n8n', category: 'Automation', description: 'Fair-code automation platform.', isPopular: false, comingSoon: false },
  { id: 92, name: 'Workato', slug: 'workato', category: 'Automation', description: 'Enterprise automation and integration.', isPopular: false, comingSoon: false },

  // SOCIAL MEDIA & MARKETING (7)
  { id: 93, name: 'Twitter', slug: 'x', category: 'Social Media & Marketing', description: 'Social media automation and analytics.', isPopular: false, comingSoon: false },
  { id: 94, name: 'LinkedIn', slug: 'linkedin', category: 'Social Media & Marketing', description: 'Professional networking and content automation.', isPopular: false, comingSoon: false },
  { id: 95, name: 'Facebook Pages', slug: 'facebook', category: 'Social Media & Marketing', description: 'Business page management and automation.', isPopular: false, comingSoon: false },
  { id: 96, name: 'Instagram Business', slug: 'instagram', category: 'Social Media & Marketing', description: 'Business profile and content automation.', isPopular: false, comingSoon: false },
  { id: 97, name: 'Buffer', slug: 'buffer', category: 'Social Media & Marketing', description: 'Social media scheduling and analytics.', isPopular: false, comingSoon: false },
  { id: 98, name: 'Hootsuite', slug: 'hootsuite', category: 'Social Media & Marketing', description: 'Social media management platform.', isPopular: false, comingSoon: false },
  { id: 99, name: 'Canva', slug: 'canva', category: 'Social Media & Marketing', description: 'Design automation and content creation.', isPopular: false, comingSoon: false },

  // E-COMMERCE & MARKETPLACES (6)
  { id: 100, name: 'Shopify', slug: 'shopify', category: 'E-commerce & Marketplaces', description: 'E-commerce platform and store automation.', isPopular: true, comingSoon: false },
  { id: 101, name: 'WooCommerce', slug: 'woocommerce', category: 'E-commerce & Marketplaces', description: 'WordPress e-commerce plugin automation.', isPopular: false, comingSoon: false },
  { id: 102, name: 'Amazon Seller', slug: 'amazon', category: 'E-commerce & Marketplaces', description: 'Amazon marketplace automation and analytics.', isPopular: false, comingSoon: false },
  { id: 103, name: 'eBay', slug: 'ebay', category: 'E-commerce & Marketplaces', description: 'eBay marketplace automation and management.', isPopular: false, comingSoon: false },
  { id: 104, name: 'Etsy', slug: 'etsy', category: 'E-commerce & Marketplaces', description: 'Etsy shop management and automation.', isPopular: false, comingSoon: false },
  { id: 105, name: 'BigCommerce', slug: 'bigcommerce', category: 'E-commerce & Marketplaces', description: 'Cloud-based e-commerce platform.', isPopular: false, comingSoon: false },

  // ANALYTICS & MONITORING (6)
  { id: 106, name: 'Google Analytics', slug: 'google-analytics', category: 'Analytics & Monitoring', description: 'Web analytics and reporting automation.', isPopular: true, comingSoon: false },
  { id: 107, name: 'Mixpanel', slug: 'mixpanel', category: 'Analytics & Monitoring', description: 'Product analytics and user tracking.', isPopular: false, comingSoon: false },
  { id: 108, name: 'Segment', slug: 'segment', category: 'Analytics & Monitoring', description: 'Customer data platform and analytics.', isPopular: false, comingSoon: false },
  { id: 109, name: 'Amplitude', slug: 'amplitude', category: 'Analytics & Monitoring', description: 'Digital analytics and insights platform.', isPopular: false, comingSoon: false },
  { id: 110, name: 'Datadog', slug: 'datadog', category: 'Analytics & Monitoring', description: 'Infrastructure monitoring and observability.', isPopular: false, comingSoon: false },
  { id: 111, name: 'New Relic', slug: 'newrelic', category: 'Analytics & Monitoring', description: 'Application performance monitoring.', isPopular: false, comingSoon: false },

  // CLOUD STORAGE & FILE MANAGEMENT (4)
  { id: 112, name: 'Dropbox', slug: 'dropbox', category: 'Cloud Storage & File Management', description: 'File storage and sharing automation.', isPopular: true, comingSoon: false },
  { id: 113, name: 'Box', slug: 'box', category: 'Cloud Storage & File Management', description: 'Enterprise cloud content management.', isPopular: false, comingSoon: false },
  { id: 114, name: 'AWS S3', slug: 'amazonaws', category: 'Cloud Storage & File Management', description: 'Scalable cloud storage and data management.', isPopular: false, comingSoon: false },
  { id: 115, name: 'iCloud Drive', slug: 'icloud', category: 'Cloud Storage & File Management', description: 'Apple cloud storage and sync.', isPopular: false, comingSoon: false },

  // DESIGN & COLLABORATION (3)
  { id: 116, name: 'Miro', slug: 'miro', category: 'Design & Collaboration', description: 'Online whiteboard and collaboration platform.', isPopular: false, comingSoon: false },
  { id: 117, name: 'Figma', slug: 'figma', category: 'Design & Collaboration', description: 'Design collaboration and prototyping.', isPopular: false, comingSoon: false },
  { id: 118, name: 'InVision', slug: 'invision', category: 'Design & Collaboration', description: 'Digital product design and collaboration.', isPopular: false, comingSoon: false },
]

const CATEGORIES = [
  'All',
  'Google Workspace',
  'Microsoft 365',
  'Communication',
  'Project Management',
  'CRM & Sales',
  'Developer Tools',
  'Productivity',
  'Calendar & Scheduling',
  'Finance & Accounting',
  'Customer Support',
  'Automation',
  'Social Media & Marketing',
  'E-commerce & Marketplaces',
  'Analytics & Monitoring',
  'Cloud Storage & File Management',
  'Design & Collaboration'
]

export default function IntegrationsShowcasePage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [showPopularOnly, setShowPopularOnly] = useState(false)

  const filteredIntegrations = useMemo(() => {
    let filtered = ALL_INTEGRATIONS

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(integration =>
        integration.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        integration.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        integration.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Filter by category
    if (selectedCategory !== 'All') {
      filtered = filtered.filter(integration => integration.category === selectedCategory)
    }

    // Filter by popular
    if (showPopularOnly) {
      filtered = filtered.filter(integration => integration.isPopular)
    }

    return filtered
  }, [searchQuery, selectedCategory, showPopularOnly])

  const popularIntegrations = ALL_INTEGRATIONS.filter(integration => integration.isPopular)

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      <Navbar />
      
      {/* Hero Section */}
      <section className="pt-32 pb-20 bg-gradient-to-b from-slate-50 to-white dark:from-gray-950 dark:to-gray-900 granular-bg">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h1 className="text-5xl sm:text-6xl font-bold text-gray-900 dark:text-gray-100 mb-6 tracking-tight">
              All Integrations
              <span className="block mt-2 bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 dark:from-slate-400 dark:via-slate-300 dark:to-slate-200 bg-clip-text text-transparent">
                118 and counting
              </span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-400 mb-12 leading-relaxed">
              Connect Aurelius to your entire digital workspace. From email and calendars to 
              project management and development tools—we integrate with everything.
            </p>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-2xl mx-auto mb-12">
              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">118</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Integrations</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-2">{popularIntegrations.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Most Popular</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-2">{ALL_INTEGRATIONS.filter(i => !i.comingSoon).length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Available Now</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-purple-600 dark:text-purple-400 mb-2">{CATEGORIES.length - 1}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Categories</div>
              </div>
            </div>

            <Link href="/signup">
              <Button variant="primary" size="lg">
                Get Started Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Search & Filters */}
      <section className="py-16 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto space-y-8">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5 z-10" />
              <Input
                type="text"
                placeholder="Search integrations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-12 pr-4 h-14 text-lg border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-500 dark:placeholder:text-gray-400 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            {/* Filter Buttons */}
            <div className="flex flex-wrap gap-3">
              <Button
                variant={showPopularOnly ? "default" : "outline"}
                size="sm"
                onClick={() => setShowPopularOnly(!showPopularOnly)}
                className="h-10"
              >
                <Zap className="w-4 h-4 mr-2" />
                Popular
              </Button>
              {CATEGORIES.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="h-10"
                >
                  {category}
                </Button>
              ))}
            </div>

            {/* Results count */}
            <div className="text-center">
              <p className="text-gray-600 dark:text-gray-400">
                Showing {filteredIntegrations.length} of {ALL_INTEGRATIONS.length} integrations
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Integrations Grid */}
      <section className="pb-20 bg-white dark:bg-gray-900">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {filteredIntegrations.map((integration, index) => (
              <motion.div
                key={integration.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: index * 0.05 }}
              >
                <Card className="liquid-glass rounded-2xl p-6 h-full transition-all duration-300 hover:shadow-lg border-0 group">
                  <div className="flex flex-col h-full">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="w-12 h-12 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center text-xl group-hover:scale-110 transition-transform">
                        <Image 
                          src={getLogoUrl(integration.slug)}
                          alt={`${integration.name} logo`}
                          width={24}
                          height={24}
                          className="w-6 h-6"
                          onError={(e) => {
                            // Fallback to a generic icon if the logo fails
                            e.currentTarget.style.display = 'none'
                            const fallback = e.currentTarget.nextElementSibling
                            if (fallback && fallback instanceof HTMLElement) {
                              fallback.style.display = 'flex'
                            }
                          }}
                        />
                        <div className="w-6 h-6 bg-gradient-to-br from-blue-500 to-purple-600 rounded flex items-center justify-center text-white text-xs font-bold" style={{display: 'none'}}>
                          {integration.name.substring(0, 2).toUpperCase()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {integration.isPopular && (
                          <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full">
                            Popular
                          </span>
                        )}
                        {integration.comingSoon && (
                          <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700">
                            Coming Soon
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {integration.name}
                      </h3>
                      <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-full border border-gray-200 dark:border-gray-700 mb-3 inline-block">
                        {integration.category}
                      </span>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {integration.description}
                      </p>
                    </div>

                    {/* Footer */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      {integration.comingSoon ? (
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          Coming Soon
                        </Button>
                      ) : (
                        <Link href="/signup">
                          <Button size="sm" className="w-full group-hover:bg-blue-600 transition-colors">
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Connect
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>

          {/* No results */}
          {filteredIntegrations.length === 0 && (
            <div className="text-center py-20">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                <Search className="w-8 h-8 text-gray-400 dark:text-gray-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-4">
                No integrations found
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Try adjusting your search or filters to find what you're looking for.
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchQuery('')
                  setSelectedCategory('All')
                  setShowPopularOnly(false)
                }}
              >
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 dark:bg-gray-950 text-white">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h2 className="text-4xl font-bold mb-6">
              Don't see your tool?
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              We're constantly adding new integrations. Request yours and we'll prioritize it.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button variant="primary" size="lg">
                  Request Integration
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="outline" size="lg">
                  Start Free Trial
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  )
}