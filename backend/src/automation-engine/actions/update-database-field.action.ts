import { Injectable } from '@nestjs/common';
import { BaseAction } from './base-action';
import { AutomationEvent } from '../interfaces/event.interface';
import { ActionResult } from '../interfaces/action.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UpdateDatabaseFieldAction extends BaseAction {
  readonly type = 'update_database_field';

  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async execute(event: AutomationEvent, config: Record<string, any>): Promise<ActionResult> {
    const { model, where, data } = config;
    if (!model || !where || !data) {
      return this.fail('update_database_field requires model, where, and data config');
    }

    try {
      const compiledWhere = this.compileObject(where, event.payload);
      const compiledData = this.compileObject(data, event.payload);

      const prismaModel = (this.prisma as any)[model];
      if (!prismaModel || typeof prismaModel.updateMany !== 'function') {
        return this.fail(`Prisma model "${model}" not found or not updatable`);
      }

      const result = await prismaModel.updateMany({
        where: compiledWhere,
        data: compiledData,
      });

      return this.success(`Updated ${result.count} record(s) in ${model}`, {
        model,
        count: result.count,
      });
    } catch (error: any) {
      return this.fail(`Database update failed: ${error.message}`);
    }
  }

  private compileObject(obj: Record<string, any>, payload: Record<string, any>): Record<string, any> {
    const result: Record<string, any> = {};
    for (const [key, value] of Object.entries(obj)) {
      if (typeof value === 'string') {
        result[key] = value.replace(/\{\{(\w+)\}\}/g, (_, k) => String(payload[k] ?? `{{${k}}}`));
      } else if (value !== null && typeof value === 'object') {
        result[key] = this.compileObject(value, payload);
      } else {
        result[key] = value;
      }
    }
    return result;
  }
}
