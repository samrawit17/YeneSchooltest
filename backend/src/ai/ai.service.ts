import { Injectable, Logger } from '@nestjs/common';
import { StudentContextService } from './context/student-context.service';
import { SchoolContextService } from './context/school-context.service';
import { HelpService } from '../help/help.service';
import { AiToolExecutorService } from './tools/ai-tool-executor.service';
import { AI_TOOLS } from './tools/ai-tools.registry';
import { CHAT_PROMPTS, REPORT_PROMPTS, ALERT_PROMPTS } from './prompts';

export interface AiChatResponse {
  reply: string;
  sources?: string[];
  contextUsed?: string[];
}

export interface AiReportResponse {
  academicSummary: string;
  strengths: string[];
  improvements: string[];
  teacherRemark: string;
}

export interface AiAlertItem {
  studentId: string;
  studentName: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reasons: string[];
  details: Record<string, any>;
}

export interface AiAlertsResponse {
  alerts: AiAlertItem[];
  schoolSummary?: string;
}

export interface AiRecommendation {
  type: string;
  title: string;
  description: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface AiRecommendationsResponse {
  recommendations: AiRecommendation[];
}

type AiProvider = 'openai' | 'gemini';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly apiKey: string | null;
  private readonly apiUrl: string;
  private readonly model: string;
  private readonly provider: AiProvider;
  public readonly isConfigured: boolean;
  public get providerName(): AiProvider { return this.provider; }

  constructor(
    private readonly studentContext: StudentContextService,
    private readonly schoolContext: SchoolContextService,
    private readonly helpService: HelpService,
    private readonly toolExecutor: AiToolExecutorService,
  ) {
    this.apiKey = process.env.AI_API_KEY || process.env.OPENAI_API_KEY || null;
    this.apiUrl = process.env.AI_API_URL || '';
    this.model = process.env.AI_MODEL || 'gpt-4o-mini';
    this.isConfigured = !!this.apiKey;

    const explicitProvider = process.env.AI_PROVIDER?.toLowerCase().trim() as AiProvider | undefined;
    if (explicitProvider === 'gemini' || explicitProvider === 'openai') {
      this.provider = explicitProvider;
    } else if (this.apiKey?.startsWith('AIza')) {
      this.provider = 'gemini';
    } else {
      this.provider = 'openai';
    }
  }

  async chat(
    message: string,
    context: { role: string; schoolId: string; studentId?: string; classId?: string; jwtToken?: string },
  ): Promise<AiChatResponse> {
    const contextData: string[] = [];
    let systemContext = '';

    if (context.schoolId) {
      const schoolInfo = await this.schoolContext.getBasicInfo(context.schoolId);
      if (schoolInfo) {
        systemContext += `School: ${schoolInfo.name} (${schoolInfo.code})\n`;
        contextData.push('school-info');
      }
    }

    if (context.studentId) {
      const studentData = await this.studentContext.getComprehensiveProfile(
        context.studentId, context.schoolId,
      );
      if (studentData) {
        systemContext += `\nStudent Profile:\n${JSON.stringify(studentData, null, 2)}`;
        contextData.push('student-profile');
      }
    }

    const relevantHelp = await this.helpService.findRelevant(message, context.role);
    if (relevantHelp.length > 0) {
      const helpBlock = relevantHelp.map((a) =>
        `[${a.category}] ${a.title}${a.summary ? `: ${a.summary}` : ''}\n${a.content}${a.linkUrl ? `\nLink: ${a.linkUrl}` : ''}`
      ).join('\n\n');
      systemContext += `\n\n**Relevant Help Articles:**\n${helpBlock}`;
      contextData.push('help-articles');
    }

    if (!this.isConfigured) {
      return this.mockChatResponse(context.role, contextData);
    }

    const systemPrompt = CHAT_PROMPTS.system(context.role, systemContext);
    try {
      const reply = await this.chatWithTools(systemPrompt, message, context.jwtToken);
      return { reply, sources: contextData, contextUsed: contextData };
    } catch {
      this.logger.warn('LLM call failed, falling back to offline mode');
      return this.mockChatResponse(context.role, contextData);
    }
  }

  async generateReport(
    studentId: string,
    schoolId: string,
    tone?: string,
  ): Promise<AiReportResponse> {
    const studentData = await this.studentContext.getComprehensiveProfile(studentId, schoolId);
    if (!studentData) {
      throw new Error('Student not found');
    }
    const schoolInfo = await this.schoolContext.getBasicInfo(schoolId);
    const contextJson = JSON.stringify({ student: studentData, school: schoolInfo }, null, 2);

    if (!this.isConfigured) {
      return this.mockReportResponse(studentData);
    }

    const systemPrompt = REPORT_PROMPTS.system(contextJson, tone);
    try {
      const reply = await this.callLlm(systemPrompt, 'Generate the academic report.');
      return this.parseReportResponse(reply);
    } catch {
      this.logger.warn('LLM call failed, falling back to offline mode');
      return this.mockReportResponse(studentData);
    }
  }

  async getAlerts(schoolId: string, studentId?: string): Promise<AiAlertsResponse> {
    const riskyStudents = await this.studentContext.getRiskyStudents(schoolId, studentId);

    const alerts: AiAlertItem[] = riskyStudents.map((s) => ({
      studentId: s.studentId,
      studentName: s.studentName,
      riskLevel: this.computeRiskLevel(s),
      reasons: s.riskFactors,
      details: s,
    }));

    if (!this.isConfigured) {
      return this.buildAlertsFallback(alerts);
    }

    const systemPrompt = ALERT_PROMPTS.system(
      JSON.stringify(alerts, null, 2),
      (await this.schoolContext.getBasicInfo(schoolId))?.name || '',
    );
    try {
      const summary = await this.callLlm(systemPrompt, 'Summarize these student alerts.');
      return { alerts, schoolSummary: summary };
    } catch {
      this.logger.warn('LLM call failed, falling back to offline mode');
      return this.buildAlertsFallback(alerts);
    }
  }

  async getRecommendations(
    schoolId: string,
    studentId?: string,
    classId?: string,
    subjectId?: string,
  ): Promise<AiRecommendationsResponse> {
    const recommendations: AiRecommendation[] = [];

    if (studentId) {
      const studentData = await this.studentContext.getComprehensiveProfile(studentId, schoolId);
      if (studentData) {
        for (const grade of studentData.grades || []) {
          const pct = parseFloat(grade.percentage) || 0;
          if (pct < 50) {
            recommendations.push({
              type: 'remediation',
              title: `${grade.subject} - Needs Improvement`,
              description: `Student scored ${pct}% in ${grade.subject}. Consider additional practice and tutoring.`,
              priority: pct < 40 ? 'HIGH' : 'MEDIUM',
            });
          }
        }
      }
    }

    if (recommendations.length === 0) {
      recommendations.push({
        type: 'general',
        title: 'All Clear',
        description: 'No specific recommendations at this time.',
        priority: 'LOW',
      });
    }

    return { recommendations };
  }

  private computeRiskLevel(s: any): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    const factors: string[] = s.riskFactors || [];
    if (factors.some((f) => /critical|severe/i.test(f))) return 'CRITICAL';
    if (factors.some((f) => /high|multiple/i.test(f))) return 'HIGH';
    if (factors.length >= 3) return 'MEDIUM';
    if (factors.length > 0) return 'LOW';
    return 'LOW';
  }

  private async chatWithTools(systemPrompt: string, userMessage: string, jwtToken?: string): Promise<string> {
    const useTools = !!jwtToken;

    const body = this.provider === 'gemini'
      ? this.buildGeminiBody(systemPrompt, userMessage, useTools ? AI_TOOLS : undefined)
      : this.buildOpenAiBody(systemPrompt, userMessage);

    const raw = await this.callLlmRaw(body);

    if (!raw) return '';

    if (this.provider === 'gemini') {
      const functionCall = raw?.candidates?.[0]?.content?.parts?.[0]?.functionCall;
      if (functionCall && useTools) {
        const result = await this.toolExecutor.execute(
          { name: functionCall.name, args: functionCall.args || {} },
          jwtToken!,
        );

        const turn2Body = this.buildGeminiBody(
          systemPrompt,
          userMessage,
          undefined,
          functionCall,
          result,
        );

        const turn2Raw = await this.callLlmRaw(turn2Body);
        return turn2Raw?.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }
      return raw?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    }

    const toolCall = raw?.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall && useTools) {
      const args = JSON.parse(toolCall.function.arguments || '{}');
      const result = await this.toolExecutor.execute(
        { name: toolCall.function.name, args },
        jwtToken!,
      );

      const turn2Body = this.buildOpenAiBody(
        systemPrompt,
        userMessage,
        toolCall,
        result,
      );

      const turn2Raw = await this.callLlmRaw(turn2Body);
      return turn2Raw?.choices?.[0]?.message?.content || '';
    }

    return raw?.choices?.[0]?.message?.content || '';
  }

  private async callLlmRaw(body: any): Promise<any> {
    const url = this.provider === 'gemini'
      ? (this.apiUrl || `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`)
      : (this.apiUrl || 'https://api.openai.com/v1/chat/completions');
    this.logger.debug(`Calling ${this.provider} LLM: ${url} (model: ${this.model})`);

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.provider === 'openai') {
      headers['Authorization'] = `Bearer ${this.apiKey}`;
    } else {
      headers['X-Goog-Api-Key'] = this.apiKey!;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private async callLlm(systemPrompt: string, userMessage: string): Promise<string> {
    try {
      const body = this.provider === 'gemini'
        ? this.buildGeminiBody(systemPrompt, userMessage)
        : this.buildOpenAiBody(systemPrompt, userMessage);

      const data = await this.callLlmRaw(body);
      return this.provider === 'gemini'
        ? data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
        : data?.choices?.[0]?.message?.content || '';
    } catch (error: any) {
      this.logger.error('LLM call failed', error);
      throw new Error(`AI service error: ${error.message}`);
    }
  }

  private buildOpenAiBody(
    systemPrompt: string,
    userMessage: string,
    toolCall?: any,
    toolResult?: { success: boolean; data?: any; error?: string },
  ) {
    const messages: any[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage },
    ];

    if (toolCall) {
      messages.push({
        role: 'assistant',
        content: null,
        tool_calls: [toolCall],
      });
      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify(toolResult),
      });
    }

    return {
      model: this.model,
      messages,
      temperature: 0.3,
      max_tokens: 2048,
      ...(toolCall ? {} : { tools: AI_TOOLS.map((t) => ({
        type: 'function' as const,
        function: {
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        },
      })) }),
    };
  }

  private buildGeminiBody(
    systemPrompt: string,
    userMessage: string,
    tools?: typeof AI_TOOLS,
    functionCall?: any,
    functionResult?: { success: boolean; data?: any; error?: string },
  ) {
    const parts: any[] = [{ text: userMessage }];
    const contents: any[] = [{ role: 'user', parts }];

    if (functionCall) {
      contents.push({
        role: 'model',
        parts: [{ functionCall: { name: functionCall.name, args: functionCall.args } }],
      });
      contents.push({
        role: 'function',
        parts: [{
          functionResponse: {
            name: functionCall.name,
            response: { name: functionCall.name, content: functionResult },
          },
        }],
      });
    }

    const body: any = {
      contents,
      systemInstruction: { parts: [{ text: systemPrompt }] },
      generationConfig: { temperature: 0.3, maxOutputTokens: 2048 },
    };

    if (tools && tools.length > 0) {
      body.tools = [{
        functionDeclarations: tools.map((t) => ({
          name: t.name,
          description: t.description,
          parameters: t.parameters,
        })),
      }];
    }

    return body;
  }

  private parseReportResponse(content: string): AiReportResponse {
    return {
      academicSummary: content,
      strengths: [],
      improvements: [],
      teacherRemark: content,
    };
  }

  private mockChatResponse(role: string, contextData: string[]): AiChatResponse {
    const greetings: Record<string, string> = {
      PARENT: 'I can help you track your child\'s progress, attendance, and fees.',
      TEACHER: 'I can help with student performance insights, class reports, and early warnings.',
      STUDENT: 'I can help you check your grades, attendance, and assignments.',
      ADMIN: 'I can help with school-wide analytics, reports, and student welfare monitoring.',
    };
    const reason = this.isConfigured
      ? 'The AI service is temporarily unavailable (rate limit or server error). Please try again later.'
      : 'Set `AI_API_KEY` (OpenAI or Gemini) to enable AI-powered responses.';
    return {
      reply: `🔌 **AI Assistant — Offline Mode**\n\n${greetings[role] || 'I can help with school-related queries.'}\n\n${reason}`,
      sources: contextData,
      contextUsed: contextData,
    };
  }

  private buildAlertsFallback(alerts: AiAlertItem[]): AiAlertsResponse {
    const suffix = this.isConfigured
      ? ' (AI summary unavailable — rate limit or server error. Try again later.)'
      : ' (Set AI_API_KEY for AI-powered summary.)';
    return {
      alerts,
      schoolSummary: alerts.length > 0
        ? `${alerts.length} student(s) flagged. Highest risk: ${alerts[0]?.studentName} (${alerts[0]?.riskLevel}).${suffix}`
        : 'No students currently flagged.',
    };
  }

  private mockReportResponse(studentData: any): AiReportResponse {
    const name = studentData?.student?.name || 'this student';
    const reason = this.isConfigured
      ? 'The AI service is temporarily unavailable (rate limit or server error). Please try again later.'
      : 'Set `AI_API_KEY` in .env to enable AI-powered reports.';
    return {
      academicSummary: `**AI Report — Offline Mode**\n\n${reason}\n\nReport for ${name} is unavailable.`,
      strengths: ['Module ready'],
      improvements: [this.isConfigured ? 'Retry later' : 'Configure the environment variable and restart'],
      teacherRemark: 'AI assistant module is built and awaiting LLM configuration.',
    };
  }
}
