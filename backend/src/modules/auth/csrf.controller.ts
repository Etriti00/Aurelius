import { Controller, Get, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';

interface CsrfRequest extends Request {
  csrfToken?: () => string;
}

@ApiTags('auth')
@Controller('csrf-token')
export class CsrfController {
  @Public()
  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Get CSRF Token',
    description:
      'Retrieve a CSRF token for state-changing requests. The token is returned in the X-CSRF-Token header.',
  })
  @ApiResponse({
    status: 200,
    description: 'CSRF token provided in X-CSRF-Token header',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'CSRF token generated' },
      },
    },
  })
  @ApiResponse({
    status: 500,
    description: 'Internal server error',
  })
  getCSRFToken(@Request() req: CsrfRequest) {
    // The CSRF middleware automatically generates and sets the token in headers
    // for GET requests, so we just need to return a success response

    const token = req.csrfToken ? req.csrfToken() : null;

    if (!token) {
      throw new Error('CSRF token generation failed');
    }

    return {
      success: true,
      message: 'CSRF token generated successfully',
      // Note: The actual token is provided in the X-CSRF-Token header by middleware
    };
  }
}
