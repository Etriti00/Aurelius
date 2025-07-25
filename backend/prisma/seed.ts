import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create sample users
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@aurelius.ai' },
    update: {},
    create: {
      email: 'demo@aurelius.ai',
      name: 'Demo User',
      roles: ['user', 'admin'],
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      voiceId: 'rachel',
      voiceSpeed: 1.0,
      preferences: {
        theme: 'light',
        notifications: {
          email: true,
          push: true,
          sound: true,
        },
        dashboard: {
          defaultView: 'overview',
          widgets: ['tasks', 'calendar', 'email', 'suggestions'],
        },
        ai: {
          autoSuggestions: true,
          proactivity: 'high',
          voice: {
            autoPlay: false,
            speed: 1.0,
          },
        },
      },
      subscription: {
        create: {
          tier: 'PRO',
          status: 'ACTIVE',
          paddleCustomerId: 'ctm_demo_user',
          paddleSubscriptionId: 'sub_demo_subscription',
          paddlePriceId: 'pri_demo_professional',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          monthlyActionLimit: 1000,
          integrationLimit: 10,
          aiModelAccess: ['claude-3-haiku', 'claude-3-5-sonnet'],
          monthlyPrice: 50.0,
          overageRate: 0.10,
        },
      },
    },
    include: {
      subscription: true,
    },
  });

  console.log('👤 Created demo user:', demoUser.email);

  // Create sample tasks
  const sampleTasks = [
    {
      title: 'Review Q4 Budget Proposal',
      description: 'Analyze the proposed budget for Q4 and provide feedback on resource allocation',
      status: 'TODO' as const,
      priority: 'HIGH' as const,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      tags: ['budget', 'finance', 'quarterly'],
      aiInsights: {
        estimatedDuration: '2 hours',
        suggestedActions: ['Schedule meeting with finance team', 'Review last quarter\'s actual vs budget'],
        priority_reasoning: 'High priority due to upcoming Q4 planning deadline',
      },
      confidence: 0.85,
    },
    {
      title: 'Prepare Presentation for Board Meeting',
      description: 'Create comprehensive presentation covering company performance and strategic initiatives',
      status: 'IN_PROGRESS' as const,
      priority: 'URGENT' as const,
      dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      tags: ['presentation', 'board', 'strategic'],
      aiInsights: {
        estimatedDuration: '4 hours',
        suggestedActions: ['Gather latest metrics', 'Review previous board feedback', 'Schedule practice session'],
        priority_reasoning: 'Urgent due to board meeting schedule',
      },
      confidence: 0.92,
    },
    {
      title: 'Team One-on-One Meetings',
      description: 'Conduct monthly one-on-one meetings with direct reports',
      status: 'TODO' as const,
      priority: 'MEDIUM' as const,
      dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 days from now
      tags: ['management', 'meetings', 'team'],
      aiInsights: {
        estimatedDuration: '3 hours',
        suggestedActions: ['Review team performance metrics', 'Prepare discussion topics', 'Schedule meetings'],
        priority_reasoning: 'Important for team development and feedback',
      },
      confidence: 0.78,
    },
    {
      title: 'Implement New Customer Feedback System',
      description: 'Set up automated customer feedback collection and analysis system',
      status: 'COMPLETED' as const,
      priority: 'MEDIUM' as const,
      completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      tags: ['customer', 'feedback', 'automation'],
      aiInsights: {
        estimatedDuration: '6 hours',
        suggestedActions: ['Research feedback tools', 'Set up integration', 'Train team'],
        priority_reasoning: 'Completed - helps improve customer satisfaction',
      },
      confidence: 0.95,
    },
  ];

  for (const task of sampleTasks) {
    await prisma.task.create({
      data: {
        ...task,
        userId: demoUser.id,
      },
    });
  }

  console.log('📋 Created sample tasks');

  // Create sample email threads
  const sampleEmailThreads = [
    {
      threadId: 'thread-001',
      provider: 'gmail',
      subject: 'Project Alpha - Status Update Required',
      snippet: 'Hi team, we need to discuss the current status of Project Alpha and next steps...',
      labels: ['work', 'project-alpha'],
      isRead: false,
      isImportant: true,
      summary: 'Project status discussion requiring urgent attention and team coordination',
      priority: 'HIGH' as const,
      sentiment: 0.2, // Slightly negative (urgency)
      aiInsights: {
        actionItems: ['Schedule status meeting', 'Prepare progress report', 'Review project timeline'],
        keyTopics: ['project status', 'team coordination', 'deadlines'],
        urgency: 'high',
      },
      lastMessageAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
      messages: {
        create: [
          {
            messageId: 'msg-001',
            fromEmail: 'alice.johnson@company.com',
            fromName: 'Alice Johnson',
            toEmails: ['demo@aurelius.ai', 'team@company.com'],
            subject: 'Project Alpha - Status Update Required',
            body: 'Hi team,\n\nWe need to discuss the current status of Project Alpha. There are some blockers that need immediate attention.\n\nCan we schedule a meeting this week?\n\nBest,\nAlice',
            sentAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
          },
        ],
      },
    },
    {
      threadId: 'thread-002',
      provider: 'gmail',
      subject: 'Welcome to the Team!',
      snippet: 'Welcome aboard! We\'re excited to have you join our team...',
      labels: ['hr', 'welcome'],
      isRead: true,
      isImportant: false,
      summary: 'Welcome message for new team member with onboarding information',
      priority: 'NORMAL' as const,
      sentiment: 0.8, // Positive
      aiInsights: {
        actionItems: ['Schedule onboarding session', 'Assign buddy', 'Send equipment list'],
        keyTopics: ['onboarding', 'team welcome', 'first day'],
        urgency: 'low',
      },
      lastMessageAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      messages: {
        create: [
          {
            messageId: 'msg-002',
            fromEmail: 'hr@company.com',
            fromName: 'HR Team',
            toEmails: ['demo@aurelius.ai'],
            subject: 'Welcome to the Team!',
            body: 'Welcome aboard! We\'re excited to have you join our team. Your first day is scheduled for Monday.\n\nPlease let us know if you have any questions.\n\nBest regards,\nHR Team',
            sentAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
          },
        ],
      },
    },
  ];

  // Note: Email sample data structure needs to be updated to match Email model
  // for (const emailThread of sampleEmailThreads) {
  //   await prisma.email.create({
  //     data: {
  //       ...emailThread,
  //       userId: demoUser.id,
  //     },
  //   });
  // }

  console.log('📧 Skipped sample emails (data structure needs update)');

  // Create sample calendar events
  const sampleEvents = [
    {
      eventId: 'event-001',
      provider: 'google',
      title: 'Weekly Team Standup',
      description: 'Weekly team sync to discuss progress, blockers, and upcoming priorities',
      location: 'Conference Room A / Zoom',
      startTime: new Date(Date.now() + 24 * 60 * 60 * 1000), // Tomorrow
      endTime: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000), // Tomorrow + 1 hour
      isAllDay: false,
      attendees: [
        { email: 'demo@aurelius.ai', name: 'Demo User', status: 'accepted' },
        { email: 'alice.johnson@company.com', name: 'Alice Johnson', status: 'accepted' },
        { email: 'bob.smith@company.com', name: 'Bob Smith', status: 'pending' },
      ],
      status: 'CONFIRMED' as const,
      preparation: 'Review weekly metrics, prepare update on current projects, list any blockers',
      aiInsights: {
        suggestedPrep: ['Review project status', 'Prepare blockers list', 'Check team availability'],
        meetingType: 'recurring',
        importance: 'medium',
      },
    },
    {
      eventId: 'event-002',
      provider: 'google',
      title: 'Client Demo - Product Showcase',
      description: 'Demonstrate new features to key client stakeholders',
      location: 'Client Office / Virtual',
      startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
      endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000), // 3 days + 2 hours
      isAllDay: false,
      attendees: [
        { email: 'demo@aurelius.ai', name: 'Demo User', status: 'accepted' },
        { email: 'client@company.com', name: 'Client Representative', status: 'accepted' },
      ],
      status: 'CONFIRMED' as const,
      preparation: 'Prepare demo script, test all features, prepare for Q&A session',
      aiInsights: {
        suggestedPrep: ['Test demo environment', 'Prepare backup plans', 'Review client history'],
        meetingType: 'external',
        importance: 'high',
      },
    },
  ];

  for (const event of sampleEvents) {
    await prisma.calendarEvent.create({
      data: {
        ...event,
        userId: demoUser.id,
      },
    });
  }

  console.log('📅 Created sample calendar events');

  // Create sample AI suggestions
  const sampleSuggestions = [
    {
      type: 'TASK_CREATE' as const,
      title: 'Schedule Project Alpha Review',
      description: 'Based on your recent email about Project Alpha status, consider scheduling a review meeting with the team to address blockers.',
      actionType: 'create_calendar_event',
      actionData: {
        title: 'Project Alpha Status Review',
        duration: 60,
        attendees: ['alice.johnson@company.com', 'team@company.com'],
        agenda: ['Review current status', 'Discuss blockers', 'Define next steps'],
      },
      confidence: 0.87,
      priority: 'HIGH' as const,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    },
    {
      type: 'EMAIL_DRAFT' as const,
      title: 'Follow up on Budget Proposal',
      description: 'Your Q4 budget review task is due soon. Consider sending a follow-up email to the finance team for any missing information.',
      actionType: 'draft_email',
      actionData: {
        to: 'finance@company.com',
        subject: 'Q4 Budget Proposal - Follow up',
        template: 'budget_followup',
      },
      confidence: 0.75,
      priority: 'MEDIUM' as const,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    },
  ];

  // Note: aISuggestion model not implemented yet, skipping AI suggestions
  // for (const suggestion of sampleSuggestions) {
  //   await prisma.aISuggestion.create({
  //     data: {
  //       ...suggestion,
  //       userId: demoUser.id,
  //     },
  //   });
  // }

  console.log('🤖 Skipped AI suggestions (model not implemented)');

  // Create sample integrations
  const sampleIntegrations = [
    {
      provider: 'google-gmail',
      accessToken: 'encrypted_token_placeholder',
      refreshToken: 'encrypted_refresh_token_placeholder',
      tokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      status: 'ACTIVE' as const,
      lastSyncAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      settings: {
        syncFrequency: '15m',
        labels: ['INBOX', 'IMPORTANT'],
        autoProcess: true,
      },
    },
    {
      provider: 'google-calendar',
      accessToken: 'encrypted_token_placeholder',
      refreshToken: 'encrypted_refresh_token_placeholder',
      tokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour from now
      status: 'ACTIVE' as const,
      lastSyncAt: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      settings: {
        syncFrequency: '5m',
        calendars: ['primary', 'work'],
        autoPrep: true,
      },
    },
  ];

  for (const integration of sampleIntegrations) {
    await prisma.integration.create({
      data: {
        ...integration,
        userId: demoUser.id,
      },
    });
  }

  console.log('🔗 Created sample integrations');

  // Create sample AI usage logs
  const sampleUsageLogs = [
    {
      model: 'claude-3-5-sonnet',
      action: 'email-analysis',
      inputTokens: 450,
      outputTokens: 125,
      totalCost: 0.002175,
      duration: 850,
      cacheHit: false,
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    },
    {
      model: 'claude-3-haiku',
      action: 'task-prioritization',
      inputTokens: 200,
      outputTokens: 85,
      totalCost: 0.000071,
      duration: 320,
      cacheHit: false,
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
    },
    {
      model: 'claude-3-5-sonnet',
      action: 'suggestion-generation',
      inputTokens: 350,
      outputTokens: 180,
      totalCost: 0.00159,
      duration: 1200,
      cacheHit: true,
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
    },
  ];

  for (const usageLog of sampleUsageLogs) {
    await prisma.actionLog.create({
      data: {
        type: 'ai_action',
        category: 'ai',
        model: usageLog.model,
        input: usageLog.action,
        promptTokens: usageLog.inputTokens,
        completionTokens: usageLog.outputTokens,
        cost: usageLog.totalCost,
        duration: usageLog.duration,
        cacheHit: usageLog.cacheHit,
        userId: demoUser.id,
        createdAt: usageLog.createdAt,
      },
    });
  }

  console.log('📊 Created sample AI usage logs');

  // Create sample voice interactions
  const sampleVoiceInteractions = [
    {
      transcript: 'What are my tasks for today?',
      intent: 'query',
      confidence: 0.92,
      responseText: 'You have 3 tasks scheduled for today: Review Q4 Budget Proposal (high priority), prepare for your weekly team standup, and follow up on the customer feedback system implementation.',
      responseAudio: '/uploads/voice/response-001.mp3',
      duration: 2500,
      language: 'en',
      createdAt: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
    },
    {
      transcript: 'Schedule a meeting with Alice about Project Alpha',
      intent: 'schedule',
      confidence: 0.88,
      responseText: 'I\'ll help you schedule a meeting with Alice Johnson about Project Alpha. Based on your calendars, how about tomorrow at 2 PM for one hour?',
      responseAudio: '/uploads/voice/response-002.mp3',
      duration: 3200,
      language: 'en',
      createdAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    },
  ];

  // Note: voiceInteraction model not implemented yet, skipping voice interactions  
  // for (const voiceInteraction of sampleVoiceInteractions) {
  //   await prisma.voiceInteraction.create({
  //     data: {
  //       ...voiceInteraction,
  //       userId: demoUser.id,
  //     },
  //   });
  // }

  console.log('🎤 Skipped voice interactions (model not implemented)');

  console.log('✅ Database seed completed successfully!');
  console.log('\n📋 Summary:');
  console.log(`👤 Users: 1 (demo@aurelius.ai)`);
  console.log(`📋 Tasks: ${sampleTasks.length}`);
  console.log(`📧 Email Threads: ${sampleEmailThreads.length}`);
  console.log(`📅 Calendar Events: ${sampleEvents.length}`);
  console.log(`🤖 AI Suggestions: ${sampleSuggestions.length}`);
  console.log(`🔗 Integrations: ${sampleIntegrations.length}`);
  console.log(`📊 AI Usage Logs: ${sampleUsageLogs.length}`);
  console.log(`🎤 Voice Interactions: ${sampleVoiceInteractions.length}`);
  console.log('\n🚀 You can now log in with: demo@aurelius.ai');
}

main()
  .catch((e) => {
    console.error('❌ Error during database seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });