import { BaseAction } from './base-action';
import { AutomationEvent } from '../interfaces/event.interface';
import { ActionResult } from '../interfaces/action.interface';
import { PrismaService } from '../../prisma/prisma.service';
export declare class CreateAlertAction extends BaseAction {
    private readonly prisma;
    readonly type = "create_alert";
    constructor(prisma: PrismaService);
    execute(event: AutomationEvent, config: Record<string, any>): Promise<ActionResult>;
    private compileTemplate;
}
