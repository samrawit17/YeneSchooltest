import { PrismaService } from '../prisma/prisma.service';
import { AutomationEvent } from './interfaces/event.interface';
import { ActionResult } from './interfaces/action.interface';
export declare class ExecutionLoggerService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    logExecution(params: {
        schoolId: string;
        ruleId: string;
        ruleName?: string;
        event: AutomationEvent;
        results: ActionResult[];
        executionTimeMs: number;
    }): Promise<void>;
}
