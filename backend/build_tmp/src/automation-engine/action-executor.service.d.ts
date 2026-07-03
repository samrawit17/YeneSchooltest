import { ModuleRef } from '@nestjs/core';
import { IAutomationAction, ActionResult } from './interfaces/action.interface';
import { AutomationEvent } from './interfaces/event.interface';
import { ActionConfig } from './interfaces/rule.interface';
export declare class ActionExecutorService {
    private readonly moduleRef;
    private readonly logger;
    private actionMap;
    constructor(moduleRef: ModuleRef);
    registerAction(action: IAutomationAction): void;
    executeActions(actions: ActionConfig[], event: AutomationEvent): Promise<ActionResult[]>;
}
