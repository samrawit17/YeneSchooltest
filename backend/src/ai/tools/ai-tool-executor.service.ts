import { Injectable, Logger } from '@nestjs/common';

interface ToolCallRequest {
  name: string;
  args: Record<string, any>;
}

interface ToolCallResult {
  success: boolean;
  data?: any;
  error?: string;
}

@Injectable()
export class AiToolExecutorService {
  private readonly logger = new Logger(AiToolExecutorService.name);
  private readonly backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 8001}`;

  async execute(tool: ToolCallRequest, jwtToken: string): Promise<ToolCallResult> {
    this.logger.log(`Executing tool: ${tool.name}(${JSON.stringify(tool.args)})`);

    const route = this.getRoute(tool.name);
    if (!route) {
      return { success: false, error: `Unknown tool: ${tool.name}` };
    }

    try {
      const response = await fetch(`${this.backendUrl}${route.path}`, {
        method: route.method,
        headers: {
          'Content-Type': 'application/json',
          Cookie: `Authentication=${jwtToken}`,
        },
        body: route.method === 'POST' ? JSON.stringify(tool.args) : undefined,
      });

      if (!response.ok) {
        const body = await response.text();
        return { success: false, error: `API error (${response.status}): ${body}` };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (err: any) {
      this.logger.error(`Tool execution failed: ${tool.name}`, err);
      return { success: false, error: err.message };
    }
  }

  private getRoute(name: string): { path: string; method: 'POST' | 'GET' } | null {
    switch (name) {
      case 'createLesson':
        return { path: '/lessons', method: 'POST' };
      case 'recordDiscipline':
        return { path: '/discipline', method: 'POST' };
      case 'createAnnouncement':
        return { path: '/announcements', method: 'POST' };
      case 'createEvent':
        return { path: '/events', method: 'POST' };
      case 'sendCommunication':
        return { path: '/communications', method: 'POST' };
      default:
        return null;
    }
  }
}
