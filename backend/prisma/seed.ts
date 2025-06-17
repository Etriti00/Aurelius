import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seeding...')

  // Create test user
  const hashedPassword = await bcrypt.hash('password123', 12)
  
  const testUser = await prisma.user.upsert({
    where: { email: 'test@aurelius.ai' },
    update: {},
    create: {
      email: 'test@aurelius.ai',
      password: hashedPassword,
      name: 'Test User',
      preferences: {
        theme: 'light',
        notifications: true,
        timezone: 'America/New_York',
      },
    },
  })

  console.log('👤 Created test user:', testUser.email)

  // Create subscription for test user
  const subscription = await prisma.subscription.upsert({
    where: { userId: testUser.id },
    update: {},
    create: {
      userId: testUser.id,
      tier: 'PRO',
      status: 'TRIALING',
      currentPeriodEnd: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days
      aiActionsUsed: 0,
    },
  })

  console.log('💳 Created subscription for test user')

  // Create sample tasks
  const sampleTasks = [
    {
      title: 'Review Q4 budget proposal',
      description: 'Analyze the quarterly budget and provide feedback',
      priority: 'HIGH' as const,
      status: 'TODO' as const,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      source: 'manual',
    },
    {
      title: 'Prepare meeting agenda for team sync',
      description: 'Draft agenda items for weekly team meeting',
      priority: 'MEDIUM' as const,
      status: 'IN_PROGRESS' as const,
      source: 'ai_suggested',
    },
    {
      title: 'Follow up with client on proposal',
      description: 'Send follow-up email to client regarding project proposal',
      priority: 'HIGH' as const,
      status: 'TODO' as const,
      dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), // 1 day
      source: 'email',
    },
    {
      title: 'Update project documentation',
      description: 'Refresh README and API documentation',
      priority: 'LOW' as const,
      status: 'COMPLETED' as const,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      source: 'manual',
    },
  ]

  for (const task of sampleTasks) {
    await prisma.task.create({
      data: {
        ...task,
        userId: testUser.id,
      },
    })
  }

  console.log('📋 Created sample tasks')

  // Create sample email threads
  const sampleEmailThreads = [
    {
      threadId: 'thread_1_gmail',
      provider: 'google',
      subject: 'Project Proposal Review',
      participants: ['test@aurelius.ai', 'client@example.com'],
      lastMessageAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      isUnread: true,
      isImportant: true,
      labels: ['work', 'important'],
      aiSummary: 'Client is requesting changes to the project timeline and budget.',
    },
    {
      threadId: 'thread_2_gmail',
      provider: 'google',
      subject: 'Team Meeting Rescheduled',
      participants: ['test@aurelius.ai', 'team@aurelius.ai'],
      lastMessageAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      isUnread: false,
      isImportant: false,
      labels: ['team', 'meetings'],
      aiSummary: 'Weekly team meeting moved from Tuesday to Wednesday at 2 PM.',
    },
  ]

  for (const thread of sampleEmailThreads) {
    await prisma.emailThread.create({
      data: {
        ...thread,
        userId: testUser.id,
      },
    })
  }

  console.log('📧 Created sample email threads')

  // Create sample calendar events
  const sampleEvents = [
    {
      eventId: 'event_1_google',
      provider: 'google',
      title: 'Weekly Team Sync',
      description: 'Regular team synchronization meeting',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // Tomorrow + 1 hour
      location: 'Conference Room A',
      attendees: ['test@aurelius.ai', 'team@aurelius.ai'],
      status: 'confirmed',
    },
    {
      eventId: 'event_2_google',
      provider: 'google',
      title: 'Client Presentation',
      description: 'Present Q4 project proposal to client',
      startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 90 * 60 * 1000), // 3 days + 1.5 hours
      location: 'Virtual - Zoom',
      attendees: ['test@aurelius.ai', 'client@example.com'],
      status: 'confirmed',
      aiPrep: {
        agenda: ['Project overview', 'Timeline review', 'Budget discussion', 'Q&A'],
        keyPoints: ['Emphasize ROI', 'Address timeline concerns', 'Flexible on budget'],
      },
    },
  ]

  for (const event of sampleEvents) {
    await prisma.calendarEvent.create({
      data: {
        ...event,
        userId: testUser.id,
      },
    })
  }

  console.log('📅 Created sample calendar events')

  // Create sample AI actions
  const sampleAiActions = [
    {
      userId: testUser.id,
      actionType: 'email_draft',
      prompt: 'Draft a follow-up email to client about proposal timeline',
      response: 'Hi [Client], I wanted to follow up on our recent discussion about the project proposal timeline...',
      tokensUsed: 150,
      model: 'claude-sonnet-4-20250514',
      status: 'completed',
    },
    {
      userId: testUser.id,
      actionType: 'task_analysis',
      prompt: 'Analyze my upcoming tasks and suggest prioritization',
      response: 'Based on your upcoming deadlines and task priorities, I recommend focusing on...',
      tokensUsed: 200,
      model: 'claude-sonnet-4-20250514',
      status: 'completed',
    },
  ]

  for (const action of sampleAiActions) {
    await prisma.aiAction.create({
      data: action,
    })
  }

  console.log('🤖 Created sample AI actions')

  console.log('✅ Database seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Error during database seeding:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })