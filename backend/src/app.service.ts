import { Injectable } from '@nestjs/common';

interface AppInfo {
  name: string;
  version: string;
  description: string;
  status: string;
  timestamp: string;
}

@Injectable()
export class AppService {
  getAppInfo(): AppInfo {
    return {
      name: 'Aurelius Backend',
      version: '1.0.0',
      description: 'AI Personal Assistant - Revolutionary digital chief of staff',
      status: 'running',
      timestamp: new Date().toISOString(),
    };
  }
}