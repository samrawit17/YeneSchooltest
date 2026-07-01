import { IAutomationAction, ActionResult } from '../interfaces/action.interface';
import { AutomationEvent } from '../interfaces/event.interface';

export abstract class BaseAction implements IAutomationAction {
  abstract readonly type: string;

  abstract execute(event: AutomationEvent, config: Record<string, any>): Promise<ActionResult>;

  protected success(message: string, details?: any): ActionResult {
    return { actionType: this.type, success: true, message, details };
  }

  protected fail(message: string, details?: any): ActionResult {
    return { actionType: this.type, success: false, message, details };
  }
}
