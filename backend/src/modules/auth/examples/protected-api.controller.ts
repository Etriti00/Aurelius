import { Controller, Get, Post, Body, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import {
  EnhancedApiKeyGuard,
  RequireApiKeyScopes,
  RequireApiKeyPermissions,
  CurrentApiKey,
} from '../guards/enhanced-api-key.guard';

interface ApiKeyRequest extends Request {
  apiKey: {
    id: string;
    userId: string;
    user: {
      id: string;
      email: string;
      roles: string[];
    };
    scopes: string[];
    permissions: Record<string, unknown>;
  };
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  timestamp: string;
  apiKeyId: string;
}

@ApiTags('api-protected')
@Controller('api/v1/protected')
@UseGuards(EnhancedApiKeyGuard)
@ApiBearerAuth('API-Key')
export class ProtectedApiController {
  @Get('public')
  @ApiOperation({
    summary: 'Public endpoint - requires only valid API key',
    description: 'This endpoint requires a valid API key but no specific scopes or permissions',
  })
  @ApiResponse({
    status: 200,
    description: 'Success',
    schema: {
      example: {
        success: true,
        data: { message: 'Hello from protected API!' },
        timestamp: '2024-12-29T10:30:00.000Z',
        apiKeyId: 'cuid123',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing API key',
  })
  getPublicData(@Request() req: ApiKeyRequest): ApiResponse<{
    message: string;
    authenticatedUser: string;
    allowedScopes: string[];
  }> {
    return {
      success: true,
      data: {
        message: 'Hello from protected API!',
        authenticatedUser: req.apiKey.user.email,
        allowedScopes: req.apiKey.scopes,
      },
      timestamp: new Date().toISOString(),
      apiKeyId: req.apiKey.id,
    };
  }

  @Get('tasks')
  @RequireApiKeyScopes('read:tasks')
  @ApiOperation({
    summary: 'Get tasks - requires read:tasks scope',
    description: 'This endpoint requires the read:tasks scope in the API key',
  })
  @ApiResponse({
    status: 200,
    description: 'Tasks retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing read:tasks scope',
  })
  getTasks(@Request() req: ApiKeyRequest): ApiResponse<unknown[]> {
    return {
      success: true,
      data: [
        { id: '1', title: 'Complete API documentation', status: 'pending' },
        { id: '2', title: 'Implement rate limiting', status: 'completed' },
      ],
      timestamp: new Date().toISOString(),
      apiKeyId: req.apiKey.id,
    };
  }

  @Post('tasks')
  @RequireApiKeyScopes('write:tasks')
  @RequireApiKeyPermissions({
    tasks: { create: true },
  })
  @ApiOperation({
    summary: 'Create task - requires write:tasks scope and create permission',
    description: 'This endpoint requires both write:tasks scope and tasks.create permission',
  })
  @ApiResponse({
    status: 201,
    description: 'Task created successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing required scope or permission',
  })
  createTask(
    @Body() taskData: { title: string; description?: string },
    @Request() req: ApiKeyRequest
  ): ApiResponse<{ id: string; title: string; description?: string }> {
    const newTask = {
      id: Math.random().toString(36).substr(2, 9),
      title: taskData.title,
      description: taskData.description,
      createdAt: new Date().toISOString(),
      createdBy: req.apiKey.user.email,
    };

    return {
      success: true,
      data: newTask,
      message: 'Task created successfully',
      timestamp: new Date().toISOString(),
      apiKeyId: req.apiKey.id,
    };
  }

  @Get('calendar')
  @RequireApiKeyScopes('read:calendar', 'read:events')
  @ApiOperation({
    summary: 'Get calendar - requires multiple scopes',
    description: 'This endpoint requires both read:calendar AND read:events scopes',
  })
  @ApiResponse({
    status: 200,
    description: 'Calendar data retrieved successfully',
  })
  getCalendarData(@Request() req: ApiKeyRequest): ApiResponse<unknown[]> {
    return {
      success: true,
      data: [
        {
          id: '1',
          title: 'Team meeting',
          start: '2024-12-30T10:00:00Z',
          end: '2024-12-30T11:00:00Z',
        },
        {
          id: '2',
          title: 'Code review',
          start: '2024-12-30T14:00:00Z',
          end: '2024-12-30T15:00:00Z',
        },
      ],
      timestamp: new Date().toISOString(),
      apiKeyId: req.apiKey.id,
    };
  }

  @Get('admin')
  @RequireApiKeyScopes('admin:read')
  @RequireApiKeyPermissions({
    admin: { access: true },
    system: { read: true },
  })
  @ApiOperation({
    summary: 'Admin endpoint - requires admin scope and permissions',
    description: 'This endpoint requires admin:read scope and specific admin permissions',
  })
  @ApiResponse({
    status: 200,
    description: 'Admin data retrieved successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Missing admin privileges',
  })
  getAdminData(@Request() req: ApiKeyRequest): ApiResponse<{
    systemInfo: Record<string, unknown>;
    userInfo: Record<string, unknown>;
  }> {
    return {
      success: true,
      data: {
        systemInfo: {
          version: '1.0.0',
          uptime: process.uptime(),
          memory: process.memoryUsage(),
        },
        userInfo: {
          apiKeyUser: req.apiKey.user,
          apiKeyScopes: req.apiKey.scopes,
          apiKeyPermissions: req.apiKey.permissions,
        },
      },
      timestamp: new Date().toISOString(),
      apiKeyId: req.apiKey.id,
    };
  }

  @Get('whoami')
  @ApiOperation({
    summary: 'Get current API key information',
    description: 'Returns information about the authenticated API key and user',
  })
  getApiKeyInfo(
    @CurrentApiKey()
    apiKey: {
      id: string;
      scopes: string[];
      permissions: Record<string, unknown>;
      user: Record<string, unknown>;
    }
  ): ApiResponse<{
    apiKey: Record<string, unknown>;
    user: Record<string, unknown>;
  }> {
    return {
      success: true,
      data: {
        apiKey: {
          id: apiKey.id,
          scopes: apiKey.scopes,
          permissions: apiKey.permissions,
        },
        user: apiKey.user,
      },
      timestamp: new Date().toISOString(),
      apiKeyId: apiKey.id,
    };
  }
}
