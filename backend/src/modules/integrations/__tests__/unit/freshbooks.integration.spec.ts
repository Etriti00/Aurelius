import { User } from '@prisma/client';
import { FreshBooksIntegration } from '../../freshbooks/freshbooks.integration'
import { IntegrationTestHelper } from '../helpers/integration-test-helper'
import {
  AuthResult,
  SyncResult,
  ConnectionStatus,
  WebhookPayload
} from '../../base/integration.interface'

describe('FreshBooksIntegration', () => {
  let integration: FreshBooksIntegration
  let mocks: Record<string, jest.Mock>
  let fetchMock: jest.SpyInstance

  beforeEach(async () => {
    const setup = await IntegrationTestHelper.createTestIntegration(
      FreshBooksIntegration,
      'freshbooks',
    )
    integration = setup.integration
    mocks = setup.mocks
}
  }

    fetchMock = IntegrationTestHelper.mockFetch({
      'POST https://api.freshbooks.com/auth/oauth/token':
        IntegrationTestHelper.createMockApiResponse({
          access_token: 'test_access_token',
          token_type: 'Bearer',
          expires_in: 3600,
          refresh_token: 'test_refresh_token'}),
      'GET https://api.freshbooks.com/auth/api/v1/users/me':
        IntegrationTestHelper.createMockApiResponse({
          response: {,
            id: 'user123',
            first_name: 'John',
            last_name: 'Doe',
            email: 'john@example.com',
            business_id: 'biz123',
            business_memberships: [
              {
                id: 'membership123',
                business: {,
                  id: 'biz123',
                  name: 'Test Business',
                  account_id: 'acc123'},
                role: 'owner'},
            ],
            created_at: '2024-01-01T00Z',
            updated_at: '2024-01-01T00Z'}),
      'GET https://api.freshbooks.com/accounting/account/acc123/users/clients':
        IntegrationTestHelper.createMockApiResponse({
          response: {,
            result: {
              clients: [
                {
                  id: 'client123',
                  organization: 'Test Company',
                  fname: 'Jane',
                  lname: 'Smith',
                  email: 'jane@testcompany.com',
                  company_industry: 'Technology',
                  company_size: '10-50',
                  city: 'New York',
                  country: 'US',
                  created_at: '2024-01-01T00Z',
                  updated_at: '2024-01-01T00Z',
                  vis_state: 0,
                  note: 'Important client',
                  website: 'https://testcompany.com',
                  phone_number: '+1-555-123-4567',
                  preferred_language: 'en',
                  currency_code: 'USD',
                  address: {,
                    street: '123 Business Ave',
                    city: 'New York',
                    province: 'NY',
                    country: 'US',
                    postal_code: '10001'},
              ]}),
      'GET https://api.freshbooks.com/accounting/account/acc123/users/clients/client123':
        IntegrationTestHelper.createMockApiResponse({
          response: {,
            result: {
              client: {,
                id: 'client123',
                organization: 'Test Company',
                fname: 'Jane',
                lname: 'Smith',
                email: 'jane@testcompany.com'}),
      'POST https://api.freshbooks.com/accounting/account/acc123/users/clients':
        IntegrationTestHelper.createMockApiResponse({
          response: {,
            result: {
              client: {,
                id: 'new_client456',
                organization: 'New Company',
                fname: 'Bob',
                lname: 'Johnson',
                email: 'bob@newcompany.com',
                created_at: '2024-01-15T12:00:00Z'}),
      'PUT https://api.freshbooks.com/accounting/account/acc123/users/clients/client123':
        IntegrationTestHelper.createMockApiResponse({
          response: {,
            result: {
              client: {,
                id: 'client123',
                organization: 'Updated Company',
                fname: 'Jane',
                lname: 'Smith',
                email: 'jane@updatedcompany.com'}),
      'GET https://api.freshbooks.com/accounting/account/acc123/invoices/invoices':
        IntegrationTestHelper.createMockApiResponse({
          response: {,
            result: {
              invoices: [
                {
                  id: 'invoice123',
                  accountid: 'acc123',
                  invoice_number: 'INV-001',
                  amount: {,
                    amount: '1500.00',
                    code: 'USD'},
                  outstanding: {,
                    amount: '500.00',
                    code: 'USD'},
                  ownerid: 'user123',
                  clientid: 'client123',
                  create_date: '2024-01-01',
                  due_date: '2024-01-31',
                  paid: {,
                    amount: '1000.00',
                    code: 'USD'},
                  auto_bill: false,
                  v3_status: 'sent',
                  current_organization: 'Test Business',
                  lines: [
                    {
                      lineid: 'line123',
                      type: 1,
                      description: 'Web development services',
                      amount: {,
                        amount: '1500.00',
                        code: 'USD'},
                      qty: '30',
                      unit_cost: {,
                        amount: '50.00',
                        code: 'USD'},
                  ]},
              ]}),
      'GET https://api.freshbooks.com/accounting/account/acc123/invoices/invoices/invoice123':
        IntegrationTestHelper.createMockApiResponse({
          response: {,
            result: {
              invoice: {,
                id: 'invoice123',
                invoice_number: 'INV-001',
                amount: {,
                  amount: '1500.00',
                  code: 'USD'},
                v3_status: 'sent'}),
      'POST https://api.freshbooks.com/accounting/account/acc123/invoices/invoices':
        IntegrationTestHelper.createMockApiResponse({
          response: {,
            result: {
              invoice: {,
                id: 'new_invoice456',
                invoice_number: 'INV-002',
                amount: {,
                  amount: '2000.00',
                  code: 'USD'},
                v3_status: 'draft',
                created_at: '2024-01-15T12:00:00Z'}),
      'PUT https://api.freshbooks.com/accounting/account/acc123/invoices/invoices/invoice123':
        IntegrationTestHelper.createMockApiResponse({
          response: {,
            result: {
              invoice: {,
                id: 'invoice123',
                invoice_number: 'INV-001',
                v3_status: 'sent'}),
      'GET https://api.freshbooks.com/accounting/account/acc123/expenses/expenses':
        IntegrationTestHelper.createMockApiResponse({
          response: {,
            result: {
              expenses: [
                {
                  id: 'expense123',
                  staffid: 'user123',
                  categoryid: 'cat123',
                  vendor: 'Office Supplies Inc',
                  date: '2024-01-15',
                  amount: {,
                    amount: '250.00',
                    code: 'USD'},
                  status: 0,
                  notes: 'Office supplies purchase',
                  is_cogs: false,
                  markup_percent: '0',
                  from_bulk_import: false,
                  created_at: '2024-01-15T10:00:00Z',
                  updated_at: '2024-01-15T10:00:00Z',
                  compounded_tax: false,
                  vis_state: 0,
                  include_receipt: true},
              ]}),
      'POST https://api.freshbooks.com/accounting/account/acc123/expenses/expenses':
        IntegrationTestHelper.createMockApiResponse({
          response: {,
            result: {
              expense: {,
                id: 'new_expense456',
                vendor: 'Travel Agency',
                amount: {,
                  amount: '500.00',
                  code: 'USD'},
                created_at: '2024-01-15T12:00:00Z'}),
      'GET https://api.freshbooks.com/projects/business/biz123/projects':
        IntegrationTestHelper.createMockApiResponse({
          projects: [
            {
              id: 'project123',
              title: 'Website Redesign',
              description: 'Complete website redesign project',
              due_date: '2024-02-28',
              client_id: 'client123',
              internal: false,
              budget: {,
                amount: '10000.00',
                code: 'USD'},
              rate: {,
                amount: '75.00',
                code: 'USD'},
              billing_method: 'project_rate',
              project_type: 'hourly_rate',
              active: true,
              complete: false,
              created_at: '2024-01-01T00Z',
              updated_at: '2024-01-15T00Z',
              logged_duration: 7200,
              billed_status: 'unbilled',
              group: {,
                id: 'group123',
                members: [
                  {
                    id: 'member123',
                    identity_id: 'user123',
                    role: 'owner'},
                ]},
          ]}),
      'POST https://api.freshbooks.com/projects/business/biz123/projects':
        IntegrationTestHelper.createMockApiResponse({
          project: {,
            id: 'new_project456',
            title: 'Mobile App Development',
            client_id: 'client123',
            active: true,
            created_at: '2024-01-15T12:00:00Z'}),
      'GET https://api.freshbooks.com/timetracking/business/biz123/time_entries':
        IntegrationTestHelper.createMockApiResponse({
          time_entries: [
            {
              id: 'time123',
              identity_id: 'user123',
              is_logged: true,
              started_at: '2024-01-15T09:00:00Z',
              created_at: '2024-01-15T09:00:00Z',
              updated_at: '2024-01-15T17:00:00Z',
              duration: 28800,
              client_id: 'client123',
              project_id: 'project123',
              billable: true,
              billed: false,
              logged_duration: 28800,
              note: 'Frontend development work',
              internal: false,
              active: false},
          ]}),
      'POST https://api.freshbooks.com/timetracking/business/biz123/time_entries':
        IntegrationTestHelper.createMockApiResponse({
          time_entry: {,
            id: 'new_time456',
            duration: 14400,
            client_id: 'client123',
            project_id: 'project123',
            billable: true,
            created_at: '2024-01-15T12:00:00Z'}),
      'GET https://api.freshbooks.com/accounting/account/acc123/payments/payments':
        IntegrationTestHelper.createMockApiResponse({
          response: {,
            result: {
              payments: [
                {
                  id: 'payment123',
                  invoiceid: 'invoice123',
                  amount: {,
                    amount: '1000.00',
                    code: 'USD'},
                  clientid: 'client123',
                  logid: 'log123',
                  date: '2024-01-15',
                  type: 'Check',
                  from_credit: false,
                  note: 'Payment received',
                  vis_state: 0,
                  created_at: '2024-01-15T14:00:00Z',
                  updated_at: '2024-01-15T14:00:00Z',
                  bulk: false,
                  accounting_systemid: 'acc123',
                  source: 'manual',
                  send_client_notification: true},
              ]}),
      'POST https://api.freshbooks.com/accounting/account/acc123/payments/payments':
        IntegrationTestHelper.createMockApiResponse({
          response: {,
            result: {
              payment: {,
                id: 'new_payment456',
                amount: {,
                  amount: '500.00',
                  code: 'USD'},
                type: 'Credit Card',
                created_at: '2024-01-15T12:00:00Z'}),
      'GET https://api.freshbooks.com/accounting/account/acc123/reports/accounting/profit_loss':
        IntegrationTestHelper.createMockApiResponse({
          response: {,
            result: {
              profit_loss: {,
                total_income: {
                  amount: '15000.00',
                  code: 'USD'},
                total_expenses: {,
                  amount: '5000.00',
                  code: 'USD'},
                net_profit: {,
                  amount: '10000.00',
                  code: 'USD'}})})
  })

  afterEach(() => {
    jest.clearAllMocks()
    if (fetchMock) {
      fetchMock.mockRestore()
    })
  }

  describe('Authentication', () => {
    it('should authenticate successfully with OAuth', async () => {
      const config = IntegrationTestHelper.createMockConfig({
        clientId: 'test_client_id',
        clientSecret: 'test_client_secret',
        code: 'auth_code_123',
        redirectUri: 'https://app.example.com/callback'})
  }
    }

      const result: AuthResult = await integration.authenticate(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        accessToken: 'test_access_token',
        refreshToken: 'test_refresh_token',
        expiresIn: 3600,
        userId: 'user123',
        userInfo: {,
          id: 'user123',
          name: 'John Doe',
          email: 'john@example.com'})
      }
      expect(mocks.encryptionService.encryptToken).toHaveBeenCalledWith(
        'test_access_token',
        'test-user-id',
      )
    })

    it('should handle authentication errors', async () => {
      fetchMock.mockImplementationOnce(() =>
        Promise.resolve(IntegrationTestHelper.createMockErrorResponse(401, 'Invalid credentials')),
      )
    }

      const config = IntegrationTestHelper.createMockConfig({
        clientId: 'invalid',
        clientSecret: 'invalid'})

      await expect(integration.authenticate(config)).rejects.toThrow('Authentication failed')
    })
  })

  describe('Connection Status', () => {
    it('should return connected status when authenticated', async () => {
      const config = IntegrationTestHelper.createMockConfig()
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
  }
    }

      const status: ConnectionStatus = await integration.getConnectionStatus(config)

      expect(status.connected).toBe(true)
      expect(status.user).toMatchObject({
        id: 'user123',
        name: 'John Doe',
        email: 'john@example.com'})
      expect(status.lastSync).toBeDefined()
    })

    it('should return disconnected status when authentication fails', async () => {
      const config = IntegrationTestHelper.createMockConfig()
      mocks.encryptionService.decryptToken.mockRejectedValue(new Error('Token not found'))
    }

      const status: ConnectionStatus = await integration.getConnectionStatus(config)

      expect(status.connected).toBe(false)
      expect(status.error).toBeDefined()
    })
  })

  describe('Sync Operations', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should sync successfully and return comprehensive data', async () => {
      const config = IntegrationTestHelper.createMockConfig()
    }

      const result: SyncResult = await integration.sync(config)

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        clients: expect.arrayContaining([
          expect.objectContaining({
            id: 'client123',
            organization: 'Test Company',
            email: 'jane@testcompany.com'}),
        ]),
        invoices: expect.arrayContaining([
          expect.objectContaining({
            id: 'invoice123',
            invoice_number: 'INV-001'}),
        ]),
        projects: expect.arrayContaining([
          expect.objectContaining({
            id: 'project123',
            title: 'Website Redesign'}),
        ]),
        syncedAt: expect.any(String)})
    })
  })

  describe('User Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get current user successfully', async () => {
      const _user = await integration.getCurrentUser()
    }

      expect(user).toMatchObject({
        id: 'user123',
        first_name: 'John',
        last_name: 'Doe',
        email: 'john@example.com',
        business_id: 'biz123'})
    })
  })

  describe('Clients Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get clients successfully', async () => {
      const clients = await integration.getClients()
    }

      expect(clients).toHaveLength(1)
      expect(clients[0]).toMatchObject({
        id: 'client123',
        organization: 'Test Company',
        fname: 'Jane',
        lname: 'Smith'})
    })

    it('should get specific client successfully', async () => {
      const client = await integration.getClient('client123')
    }

      expect(client).toMatchObject({
        id: 'client123',
        organization: 'Test Company'})
    })

    it('should create client successfully', async () => {
      const client = await integration.createClient({
        organization: 'New Company',
        fname: 'Bob',
        lname: 'Johnson',
        email: 'bob@newcompany.com'})
    }

      expect(client).toMatchObject({
        id: 'new_client456',
        organization: 'New Company'})
    })

    it('should update client successfully', async () => {
      const client = await integration.updateClient('client123', {
        organization: 'Updated Company'})
    }

      expect(client).toMatchObject({
        id: 'client123',
        organization: 'Updated Company'})
    })
  })

  describe('Invoices Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get invoices successfully', async () => {
      const invoices = await integration.getInvoices()
    }

      expect(invoices).toHaveLength(1)
      expect(invoices[0]).toMatchObject({
        id: 'invoice123',
        invoice_number: 'INV-001',
        v3_status: 'sent'})
    })

    it('should get specific invoice successfully', async () => {
      const invoice = await integration.getInvoice('invoice123')
    }

      expect(invoice).toMatchObject({
        id: 'invoice123',
        invoice_number: 'INV-001'})
    })

    it('should create invoice successfully', async () => {
      const invoice = await integration.createInvoice({
        clientid: 'client123',
        lines: [
          {
            description: 'Consulting services',
            amount: { amount: '2000.00', code: 'USD' },
        ]})
    }

      expect(invoice).toMatchObject({
        id: 'new_invoice456',
        invoice_number: 'INV-002'})
    })

    it('should send invoice successfully', async () => {
      const result = await integration.sendInvoice('invoice123')
    }

      expect(result).toBe(true)
    })
  })

  describe('Expenses Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get expenses successfully', async () => {
      const expenses = await integration.getExpenses()
    }

      expect(expenses).toHaveLength(1)
      expect(expenses[0]).toMatchObject({
        id: 'expense123',
        vendor: 'Office Supplies Inc',
        amount: {,
          amount: '250.00',
          code: 'USD'})
      }
    })

    it('should create expense successfully', async () => {
      const expense = await integration.createExpense({
        vendor: 'Travel Agency',
        amount: { amount: '500.00', code: 'USD' },
        date: '2024-01-15'})
    }

      expect(expense).toMatchObject({
        id: 'new_expense456',
        vendor: 'Travel Agency'})
    })
  })

  describe('Projects Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get projects successfully', async () => {
      const projects = await integration.getProjects()
    }

      expect(projects).toHaveLength(1)
      expect(projects[0]).toMatchObject({
        id: 'project123',
        title: 'Website Redesign',
        client_id: 'client123',
        active: true})
    })

    it('should create project successfully', async () => {
      const project = await integration.createProject({
        title: 'Mobile App Development',
        client_id: 'client123'})
    }

      expect(project).toMatchObject({
        id: 'new_project456',
        title: 'Mobile App Development'})
    })
  })

  describe('Time Tracking', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get time entries successfully', async () => {
      const timeEntries = await integration.getTimeEntries()
    }

      expect(timeEntries).toHaveLength(1)
      expect(timeEntries[0]).toMatchObject({
        id: 'time123',
        duration: 28800,
        billable: true,
        project_id: 'project123'})
    })

    it('should create time entry successfully', async () => {
      const timeEntry = await integration.createTimeEntry({
        duration: 14400,
        client_id: 'client123',
        project_id: 'project123',
        billable: true})
    }

      expect(timeEntry).toMatchObject({
        id: 'new_time456',
        duration: 14400,
        billable: true})
    })
  })

  describe('Payments Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get payments successfully', async () => {
      const payments = await integration.getPayments()
    }

      expect(payments).toHaveLength(1)
      expect(payments[0]).toMatchObject({
        id: 'payment123',
        invoiceid: 'invoice123',
        amount: {,
          amount: '1000.00',
          code: 'USD'})
      }
    })

    it('should create payment successfully', async () => {
      const payment = await integration.createPayment({
        invoiceid: 'invoice123',
        amount: { amount: '500.00', code: 'USD' },
        type: 'Credit Card'})
    }

      expect(payment).toMatchObject({
        id: 'new_payment456',
        type: 'Credit Card'})
    })
  })

  describe('Reports', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should get accounting report successfully', async () => {
      const report = await integration.getAccountingReport(
        'profit_loss',
        '2024-01-01',
        '2024-01-31',
      )
    }

      expect(report).toMatchObject({
        profit_loss: expect.objectContaining({,
          total_income: {
            amount: '15000.00',
            code: 'USD'})})
      }
    })
  })

  describe('Webhook Handling', () => {
    it('should process invoice webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          name: 'invoice.create',
          object: {,
            id: 'invoice123',
            invoice_number: 'INV-001'}),
        query: {}
  }
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })

    it('should process client webhooks successfully', async () => {
      const webhookPayload: WebhookPayload = {,
        headers: {
          'content-type': 'application/json'},
        body: JSON.stringify({,
          name: 'client.update',
          object: {,
            id: 'client123',
            organization: 'Updated Company'}),
        query: {}
    }

      await expect(integration.handleWebhook(webhookPayload)).resolves.not.toThrow()
    })
  })

  describe('Cache Management', () => {
    beforeEach(() => {
      mocks.encryptionService.decryptToken.mockResolvedValue('test_access_token')
    })
  }

    it('should cache data effectively', async () => {
      await integration.getClients()
      await integration.getInvoices()
    }

      expect(integration['clientsCache'].size).toBeGreaterThan(0)
      expect(integration['invoicesCache'].size).toBeGreaterThan(0)
    })

    it('should clear cache when requested', async () => {
      await integration.getClients()
      await integration.getInvoices()
    }

      integration.clearCache()

      expect(integration['clientsCache'].size).toBe(0)
      expect(integration['invoicesCache'].size).toBe(0)
      expect(integration['projectsCache'].size).toBe(0)
    })
  })

  describe('Integration Capabilities', () => {
    it('should expose correct capabilities', () => {
      expect(integration.capabilities).toEqual([
        'clients',
        'invoices',
        'expenses',
        'projects',
        'time-tracking',
        'payments',
        'reports',
        'accounting',
      ])
    })
  }

    it('should have correct provider information', () => {
      expect(integration.provider).toBe('freshbooks')
      expect(integration.name).toBe('FreshBooks')
      expect(integration.version).toBe('1.0.0')
    })
  })
})
