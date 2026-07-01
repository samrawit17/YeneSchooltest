import { AutomationEvent } from './event.interface';

export interface ActionResult {
  actionType: string;
  success: boolean;
  message?: string;
  details?: any;
}

export interface IAutomationAction {
  readonly type: string;
  execute(event: AutomationEvent, config: Record<string, any>): Promise<ActionResult>;
}
