import { IAutomationAction, ActionResult } from '../interfaces/action.interface';
import { AutomationEvent } from '../interfaces/event.interface';
export declare abstract class BaseAction implements IAutomationAction {
    abstract readonly type: string;
    abstract execute(event: AutomationEvent, config: Record<string, any>): Promise<ActionResult>;
    protected success(message: string, details?: any): ActionResult;
    protected fail(message: string, details?: any): ActionResult;
}
