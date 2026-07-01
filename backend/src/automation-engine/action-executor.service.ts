import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { IAutomationAction, ActionResult } from './interfaces/action.interface';
import { AutomationEvent } from './interfaces/event.interface';
import { ActionConfig } from './interfaces/rule.interface';

@Injectable()
export class ActionExecutorService {
  private readonly logger = new Logger(ActionExecutorService.name);
  private actionMap = new Map<string, IAutomationAction>();

  constructor(private readonly moduleRef: ModuleRef) {}

  registerAction(action: IAutomationAction): void {
    this.actionMap.set(action.type, action);
  }

  async executeActions(
    actions: ActionConfig[],
    event: AutomationEvent,
  ): Promise<ActionResult[]> {
    const results: ActionResult[] = [];

    for (const actionConfig of actions) {
      try {
        const action = this.actionMap.get(actionConfig.type);
        if (!action) {
          results.push({
            actionType: actionConfig.type,
            success: false,
            message: `Unknown action type: ${actionConfig.type}`,
          });
          continue;
        }
        const result = await action.execute(event, actionConfig.config);
        results.push(result);
      } catch (err: any) {
        this.logger.error(`Action ${actionConfig.type} failed: ${err.message}`);
        results.push({
          actionType: actionConfig.type,
          success: false,
          message: err.message,
        });
      }
    }

    return results;
  }
}
