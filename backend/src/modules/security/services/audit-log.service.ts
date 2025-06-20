import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EncryptionService } from './encryption.service';
import { Prisma } from '@prisma/client';

export enum AuditAction {
  // Authentication
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
  LOGIN_FAILED = 'LOGIN_FAILED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',
  PASSWORD_RESET = 'PASSWORD_RESET',
  MFA_ENABLED = 'MFA_ENABLED',
  MFA_DISABLED = 'MFA_DISABLED',

  // Data Access
  DATA_READ = 'DATA_READ',
  DATA_CREATE = 'DATA_CREATE',
  DATA_UPDATE = 'DATA_UPDATE',
  DATA_DELETE = 'DATA_DELETE',
  DATA_EXPORT = 'DATA_EXPORT',

  // User Management
  USER_CREATE = 'USER_CREATE',
  USER_UPDATE = 'USER_UPDATE',
  USER_DELETE = 'USER_DELETE',
  USER_SUSPEND = 'USER_SUSPEND',
  USER_ACTIVATE = 'USER_ACTIVATE',

  // Permissions
  PERMISSION_GRANT = 'PERMISSION_GRANT',
  PERMISSION_REVOKE = 'PERMISSION_REVOKE',
  ROLE_ASSIGN = 'ROLE_ASSIGN',
  ROLE_REMOVE = 'ROLE_REMOVE',

  // API Access
  API_KEY_CREATE = 'API_KEY_CREATE',
  API_KEY_REVOKE = 'API_KEY_REVOKE',
  API_ACCESS = 'API_ACCESS',
  API_ERROR = 'API_ERROR',

  // Integration
  INTEGRATION_CONNECT = 'INTEGRATION_CONNECT',
  INTEGRATION_DISCONNECT = 'INTEGRATION_DISCONNECT',
  INTEGRATION_SYNC = 'INTEGRATION_SYNC',

  // Security
  SECURITY_ALERT = 'SECURITY_ALERT',
  SUSPICIOUS_ACTIVITY = 'SUSPICIOUS_ACTIVITY',
  ACCESS_DENIED = 'ACCESS_DENIED',
}

export enum AuditSeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

interface AuditLogEntry {
  userId?: string;
  action: AuditAction;
  severity: AuditSeverity;
  resource?: string;
  resourceId?: string;
  details?: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  requestId?: string;
  success: boolean;
  error?: string;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);

  constructor(
    private prisma: PrismaService,
    private encryptionService: EncryptionService,
    private eventEmitter: EventEmitter2,
  ) {}

  /**
   * Log audit event
   */
  async log(entry: AuditLogEntry): Promise<void> {
    try {
      // Sanitize sensitive data
      const sanitizedDetails = this.sanitizeDetails(entry.details);

      // Create audit log entry
      const auditLog = await this.prisma.auditLog.create({
        data: {
          userId: entry.userId,
          action: entry.action,
          severity: entry.severity,
          resource: entry.resource,
          resourceId: entry.resourceId,
          details: sanitizedDetails,
          ipAddress: entry.ipAddress ? await this.encryptionService.encrypt(entry.ipAddress) : null,
          userAgent: entry.userAgent,
          requestId: entry.requestId,
          success: entry.success,
          error: entry.error,
          timestamp: new Date(),
        },
      });

      // Emit event for real-time monitoring
      this.eventEmitter.emit('audit.log.created', {
        id: auditLog.id,
        action: entry.action,
        severity: entry.severity,
        userId: entry.userId,
        success: entry.success,
      });

      // Log critical events
      if (entry.severity === AuditSeverity.CRITICAL) {
        this.logger.error(`Critical audit event: ${entry.action}`, {
          userId: entry.userId,
          resource: entry.resource,
          error: entry.error,
        });
      }
    } catch (error) {
      this.logger.error('Failed to create audit log', error);
      // Don't throw - audit logging should not break the application
    }
  }

  /**
   * Log successful login
   */
  async logLogin(
    userId: string,
    ipAddress: string,
    userAgent: string,
    method: string,
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.LOGIN,
      severity: AuditSeverity.INFO,
      details: { method },
      ipAddress,
      userAgent,
      success: true,
    });
  }

  /**
   * Log failed login attempt
   */
  async logFailedLogin(
    email: string,
    ipAddress: string,
    userAgent: string,
    reason: string,
  ): Promise<void> {
    await this.log({
      action: AuditAction.LOGIN_FAILED,
      severity: AuditSeverity.WARNING,
      details: {
        email: this.maskEmail(email),
        reason,
      },
      ipAddress,
      userAgent,
      success: false,
      error: reason,
    });
  }

  /**
   * Log data access
   */
  async logDataAccess(
    userId: string,
    resource: string,
    resourceId: string,
    action: 'read' | 'create' | 'update' | 'delete',
    details?: Record<string, any>,
  ): Promise<void> {
    const actionMap = {
      read: AuditAction.DATA_READ,
      create: AuditAction.DATA_CREATE,
      update: AuditAction.DATA_UPDATE,
      delete: AuditAction.DATA_DELETE,
    };

    await this.log({
      userId,
      action: actionMap[action],
      severity: AuditSeverity.INFO,
      resource,
      resourceId,
      details,
      success: true,
    });
  }

  /**
   * Log security alert
   */
  async logSecurityAlert(
    userId: string | undefined,
    alertType: string,
    details: Record<string, any>,
    ipAddress?: string,
  ): Promise<void> {
    await this.log({
      userId,
      action: AuditAction.SECURITY_ALERT,
      severity: AuditSeverity.CRITICAL,
      details: {
        alertType,
        ...details,
      },
      ipAddress,
      success: false,
    });
  }

  /**
   * Query audit logs
   */
  async queryLogs(filters: {
    userId?: string;
    action?: AuditAction;
    severity?: AuditSeverity;
    resource?: string;
    startDate?: Date;
    endDate?: Date;
    success?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: any[]; total: number }> {
    const where: Prisma.AuditLogWhereInput = {};

    if (filters.userId) where.userId = filters.userId;
    if (filters.action) where.action = filters.action;
    if (filters.severity) where.severity = filters.severity;
    if (filters.resource) where.resource = filters.resource;
    if (filters.success !== undefined) where.success = filters.success;
    
    if (filters.startDate || filters.endDate) {
      where.timestamp = {};
      if (filters.startDate) where.timestamp.gte = filters.startDate;
      if (filters.endDate) where.timestamp.lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      this.prisma.auditLog.findMany({
        where,
        orderBy: { timestamp: 'desc' },
        take: filters.limit || 100,
        skip: filters.offset || 0,
      }),
      this.prisma.auditLog.count({ where }),
    ]);

    // Decrypt IP addresses
    const decryptedLogs = await Promise.all(
      logs.map(async (log) => ({
        ...log,
        ipAddress: log.ipAddress
          ? await this.encryptionService.decrypt(log.ipAddress)
          : null,
      })),
    );

    return { logs: decryptedLogs, total };
  }

  /**
   * Get user activity summary
   */
  async getUserActivitySummary(
    userId: string,
    days: number = 30,
  ): Promise<any> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await this.prisma.auditLog.findMany({
      where: {
        userId,
        timestamp: { gte: startDate },
      },
      select: {
        action: true,
        success: true,
        timestamp: true,
      },
    });

    // Summarize activity
    const summary = {
      totalActions: logs.length,
      successfulActions: logs.filter(l => l.success).length,
      failedActions: logs.filter(l => !l.success).length,
      actionsByType: {} as Record<string, number>,
      activityByDay: {} as Record<string, number>,
      lastActivity: logs[0]?.timestamp,
    };

    // Count actions by type
    logs.forEach(log => {
      summary.actionsByType[log.action] = (summary.actionsByType[log.action] || 0) + 1;
      
      const day = log.timestamp.toISOString().split('T')[0];
      summary.activityByDay[day] = (summary.activityByDay[day] || 0) + 1;
    });

    return summary;
  }

  /**
   * Detect suspicious activity
   */
  async detectSuspiciousActivity(userId: string): Promise<boolean> {
    // Check for multiple failed login attempts
    const recentFailures = await this.prisma.auditLog.count({
      where: {
        userId,
        action: AuditAction.LOGIN_FAILED,
        timestamp: { gte: new Date(Date.now() - 15 * 60 * 1000) }, // Last 15 minutes
      },
    });

    if (recentFailures > 5) {
      await this.logSecurityAlert(
        userId,
        'MULTIPLE_LOGIN_FAILURES',
        { failureCount: recentFailures },
      );
      return true;
    }

    // Check for unusual access patterns
    const recentActions = await this.prisma.auditLog.findMany({
      where: {
        userId,
        timestamp: { gte: new Date(Date.now() - 60 * 60 * 1000) }, // Last hour
      },
      select: {
        action: true,
        ipAddress: true,
      },
    });

    // Check for rapid API access
    if (recentActions.length > 1000) {
      await this.logSecurityAlert(
        userId,
        'EXCESSIVE_API_USAGE',
        { actionCount: recentActions.length },
      );
      return true;
    }

    // Check for access from multiple IPs
    const uniqueIps = new Set(recentActions.map(a => a.ipAddress).filter(Boolean));
    if (uniqueIps.size > 5) {
      await this.logSecurityAlert(
        userId,
        'MULTIPLE_IP_ACCESS',
        { ipCount: uniqueIps.size },
      );
      return true;
    }

    return false;
  }

  /**
   * Archive old audit logs
   */
  async archiveOldLogs(daysToKeep: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    // Move to archive table or external storage
    // For now, we'll just count what would be archived
    const toArchive = await this.prisma.auditLog.count({
      where: {
        timestamp: { lt: cutoffDate },
      },
    });

    this.logger.log(`Found ${toArchive} audit logs to archive`);

    // In production, you would move these to cold storage
    // and then delete from the main table

    return toArchive;
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    startDate: Date,
    endDate: Date,
  ): Promise<any> {
    const logs = await this.prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    const report = {
      period: { start: startDate, end: endDate },
      totalEvents: logs.length,
      userActivity: {} as Record<string, any>,
      securityEvents: {
        loginFailures: 0,
        securityAlerts: 0,
        accessDenied: 0,
        suspiciousActivity: 0,
      },
      dataAccess: {
        reads: 0,
        creates: 0,
        updates: 0,
        deletes: 0,
        exports: 0,
      },
    };

    // Analyze logs
    logs.forEach(log => {
      // User activity
      if (log.userId) {
        if (!report.userActivity[log.userId]) {
          report.userActivity[log.userId] = {
            actions: 0,
            logins: 0,
            dataAccess: 0,
          };
        }
        report.userActivity[log.userId].actions++;
      }

      // Security events
      switch (log.action) {
        case AuditAction.LOGIN_FAILED:
          report.securityEvents.loginFailures++;
          break;
        case AuditAction.SECURITY_ALERT:
          report.securityEvents.securityAlerts++;
          break;
        case AuditAction.ACCESS_DENIED:
          report.securityEvents.accessDenied++;
          break;
        case AuditAction.SUSPICIOUS_ACTIVITY:
          report.securityEvents.suspiciousActivity++;
          break;
      }

      // Data access
      switch (log.action) {
        case AuditAction.DATA_READ:
          report.dataAccess.reads++;
          break;
        case AuditAction.DATA_CREATE:
          report.dataAccess.creates++;
          break;
        case AuditAction.DATA_UPDATE:
          report.dataAccess.updates++;
          break;
        case AuditAction.DATA_DELETE:
          report.dataAccess.deletes++;
          break;
        case AuditAction.DATA_EXPORT:
          report.dataAccess.exports++;
          break;
      }
    });

    return report;
  }

  /**
   * Sanitize sensitive details
   */
  private sanitizeDetails(details?: Record<string, any>): any {
    if (!details) return null;

    return this.encryptionService.sanitizeForLogging(details);
  }

  /**
   * Mask email for privacy
   */
  private maskEmail(email: string): string {
    const [localPart, domain] = email.split('@');
    if (!domain) return '***';
    
    const maskedLocal = localPart.length > 2
      ? localPart[0] + '*'.repeat(localPart.length - 2) + localPart[localPart.length - 1]
      : '***';
    
    return `${maskedLocal}@${domain}`;
  }
}