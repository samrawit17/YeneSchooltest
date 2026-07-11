"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, GripVertical, AlertCircle, ArrowRight, ToggleLeft, ToggleRight } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { automationAPI, type EventTypeInfo, type ActionTypeInfo } from "@/lib/api/automation";

interface Condition {
  id: string;
  field: string;
  operator: string;
  value: string;
}

interface ConditionGroup {
  operator: "AND" | "OR";
  conditions: Condition[];
}

interface ActionBlock {
  id: string;
  type: string;
  config: Record<string, string>;
}

interface RuleFormData {
  name: string;
  description: string;
  eventTrigger: string;
  conditions: ConditionGroup;
  actions: ActionBlock[];
  isActive: boolean;
}

interface RuleBuilderProps {
  initialData?: RuleFormData;
  ruleId?: string;
  isEdit?: boolean;
  onAfterSave?: () => void;
}

const OPERATORS = [
  { value: "eq", label: "Equals (=)" },
  { value: "neq", label: "Not equals (!=)" },
  { value: "gt", label: "Greater than (>)" },
  { value: "gte", label: "Greater or equals (>=)" },
  { value: "lt", label: "Less than (<)" },
  { value: "lte", label: "Less or equals (<=)" },
  { value: "contains", label: "Contains" },
  { value: "not_contains", label: "Does not contain" },
];

let idCounter = 0;
const genId = () => `block_${++idCounter}_${Date.now()}`;

const defaultCondition = (): Condition => ({ id: genId(), field: "", operator: "eq", value: "" });
const defaultAction = (): ActionBlock => ({ id: genId(), type: "", config: {} });

export default function RuleBuilder({ initialData, ruleId, isEdit, onAfterSave }: RuleBuilderProps) {
  const router = useRouter();
  const [eventTypes, setEventTypes] = useState<EventTypeInfo[]>([]);
  const [actionTypes, setActionTypes] = useState<ActionTypeInfo[]>([]);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<RuleFormData>(
    initialData || {
      name: "",
      description: "",
      eventTrigger: "",
      conditions: { operator: "AND", conditions: [defaultCondition()] },
      actions: [defaultAction()],
      isActive: true,
    },
  );

  useEffect(() => {
    automationAPI.getEventTypes().then((res) => setEventTypes(res.data));
    automationAPI.getActionTypes().then((res) => setActionTypes(res.data));
  }, []);

  const updateForm = useCallback((patch: Partial<RuleFormData>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  }, []);

  const addCondition = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        conditions: [...prev.conditions.conditions, defaultCondition()],
      },
    }));
  }, []);

  const removeCondition = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        conditions: prev.conditions.conditions.filter((c) => c.id !== id),
      },
    }));
  }, []);

  const updateCondition = useCallback((id: string, patch: Partial<Condition>) => {
    setForm((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        conditions: prev.conditions.conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      },
    }));
  }, []);

  const toggleConditionOperator = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      conditions: {
        ...prev.conditions,
        operator: prev.conditions.operator === "AND" ? "OR" : "AND",
      },
    }));
  }, []);

  const addAction = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      actions: [...prev.actions, defaultAction()],
    }));
  }, []);

  const removeAction = useCallback((id: string) => {
    setForm((prev) => ({
      ...prev,
      actions: prev.actions.filter((a) => a.id !== id),
    }));
  }, []);

  const updateAction = useCallback((id: string, patch: Partial<ActionBlock>) => {
    setForm((prev) => ({
      ...prev,
      actions: prev.actions.map((a) => (a.id === id ? { ...a, ...patch } : a)),
    }));
  }, []);

  const updateActionConfig = useCallback((id: string, key: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      actions: prev.actions.map((a) =>
        a.id === id ? { ...a, config: { ...a.config, [key]: value } } : a,
      ),
    }));
  }, []);

  const handleActionTypeChange = useCallback(
    (id: string, type: string) => {
      const typeInfo = actionTypes.find((at) => at.value === type);
      const config: Record<string, string> = {};
      if (typeInfo) {
        typeInfo.fields.forEach((f) => (config[f] = ""));
      }
      setForm((prev) => ({
        ...prev,
        actions: prev.actions.map((a) => (a.id === id ? { ...a, type, config } : a)),
      }));
    },
    [actionTypes],
  );

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast.error("Rule name is required");
      return;
    }
    if (!form.eventTrigger) {
      toast.error("Please select an event trigger");
      return;
    }
    if (form.actions.length === 0 || !form.actions[0].type) {
      toast.error("At least one action is required");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description || undefined,
        eventTrigger: form.eventTrigger,
        conditions: form.conditions.conditions.some((c) => c.field)
          ? { operator: form.conditions.operator, conditions: form.conditions.conditions.filter((c) => c.field) }
          : null,
        actions: form.actions
          .filter((a) => a.type)
          .map((a) => ({ type: a.type, config: a.config })),
        isActive: form.isActive,
      };

      if (isEdit && ruleId) {
        await automationAPI.updateRule(ruleId, payload);
        toast.success("Rule updated");
      } else {
        await automationAPI.createRule(payload);
        toast.success("Rule created");
      }
      if (onAfterSave) {
        onAfterSave();
      } else {
        router.push("/automation");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to save rule");
    } finally {
      setSaving(false);
    }
  };

  const selectedActionType = (id: string) => actionTypes.find((at) => at.value === form.actions.find((a) => a.id === id)?.type);

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <div className="space-y-1.5">
          <Label>Rule Name</Label>
          <Input
            placeholder="e.g. Alert admin when attendance drops below 75%"
            value={form.name}
            onChange={(e) => updateForm({ name: e.target.value })}
          />
        </div>
        <div className="space-y-1.5">
          <Label>Description (optional)</Label>
          <Textarea
            placeholder="Describe what this rule does"
            value={form.description}
            onChange={(e) => updateForm({ description: e.target.value })}
            rows={2}
          />
        </div>
      </div>

      {/* Trigger */}
      <div className="rounded-lg border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700 dark:bg-blue-900/50 dark:text-blue-400">1</span>
          Select Trigger
        </h3>
        <div className="space-y-1.5">
          <Label className="text-xs">When this event happens</Label>
          <Select value={form.eventTrigger} onValueChange={(v) => updateForm({ eventTrigger: v })}>
            <SelectTrigger>
              <SelectValue placeholder="Choose an event..." />
            </SelectTrigger>
            <SelectContent>
              {eventTypes.map((et) => (
                <SelectItem key={et.value} value={et.value}>
                  <div>
                    <span className="font-medium">{et.label}</span>
                    <span className="ml-2 text-xs text-gray-400">({et.value})</span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {form.eventTrigger && (
            <p className="text-xs text-gray-500">
              {eventTypes.find((et) => et.value === form.eventTrigger)?.description}
            </p>
          )}
        </div>
      </div>

      {/* Conditions */}
      <div className="rounded-lg border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-xs font-bold text-amber-700 dark:bg-amber-900/50 dark:text-amber-400">2</span>
          Conditions (optional)
        </h3>
        {form.conditions.conditions.length > 0 && (
          <div className="space-y-2">
            {form.conditions.conditions.map((condition, index) => (
              <div key={condition.id}>
                {index > 0 && (
                  <div className="flex justify-center py-1">
                    <button
                      type="button"
                      onClick={toggleConditionOperator}
                      className="rounded-md border bg-white px-3 py-0.5 text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-[#2A2A2A] dark:bg-[#1A1A1A] dark:text-gray-400"
                    >
                      {form.conditions.operator}
                    </button>
                  </div>
                )}
                <div className="flex items-start gap-2 rounded-lg border bg-gray-50 p-3 dark:border-[#2A2A2A] dark:bg-[#1A1A1A]/50">
                  <GripVertical className="mt-2 h-4 w-4 shrink-0 text-gray-400" />
                  <div className="grid flex-1 gap-2 sm:grid-cols-3">
                    <Input
                      placeholder="Field (e.g. percentage)"
                      value={condition.field}
                      onChange={(e) => updateCondition(condition.id, { field: e.target.value })}
                    />
                    <Select
                      value={condition.operator}
                      onValueChange={(v) => updateCondition(condition.id, { operator: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map((op) => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      placeholder="Value"
                      value={condition.value}
                      onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeCondition(condition.id)}
                    className="h-9 w-9 shrink-0 text-red-500"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
        <Button variant="outline" size="sm" onClick={addCondition} className="mt-3">
          <Plus className="mr-1 h-4 w-4" /> Add Condition
        </Button>
      </div>

      {/* Actions */}
      <div className="rounded-lg border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold mb-3">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400">3</span>
          Actions
        </h3>
        {form.actions.map((action, index) => {
          const typeInfo = selectedActionType(action.id);
          return (
            <div key={action.id} className="space-y-2 mb-3">
              {index > 0 && (
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <ArrowRight className="h-3 w-3" /> THEN
                </div>
              )}
              <div className="rounded-lg border bg-gray-50 p-3 dark:border-[#2A2A2A] dark:bg-[#1A1A1A]/50">
                <div className="mb-3 flex items-center justify-between">
                  <Select value={action.type} onValueChange={(v) => handleActionTypeChange(action.id, v)}>
                    <SelectTrigger className="w-64">
                      <SelectValue placeholder="Choose an action..." />
                    </SelectTrigger>
                    <SelectContent>
                      {actionTypes.map((at) => (
                        <SelectItem key={at.value} value={at.value}>
                          {at.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="ghost" size="icon" onClick={() => removeAction(action.id)} className="text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                {typeInfo && (
                  <div className="space-y-2">
                    {Object.keys(action.config).map((field) => (
                      <div key={field} className="space-y-1">
                        <Label className="text-xs capitalize">{field.replace(/([A-Z])/g, " $1")}</Label>
                        {field === "body" || field === "message" ? (
                          <Textarea
                            placeholder={`{{payloadField}} for dynamic values`}
                            value={action.config[field] || ""}
                            onChange={(e) => updateActionConfig(action.id, field, e.target.value)}
                            rows={2}
                          />
                        ) : (
                          <Input
                            placeholder={`Enter ${field}`}
                            value={action.config[field] || ""}
                            onChange={(e) => updateActionConfig(action.id, field, e.target.value)}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        <Button variant="outline" size="sm" onClick={addAction}>
          <Plus className="mr-1 h-4 w-4" /> Add Action
        </Button>
      </div>

      {/* Toggle + Submit */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-gray-200 dark:border-[#2A2A2A] bg-white dark:bg-[#1A1A1A] p-4">
        <div className="flex items-center gap-3">
          <Switch
            checked={form.isActive}
            onCheckedChange={(v) => updateForm({ isActive: v })}
          />
          <Label className="cursor-pointer text-sm">{form.isActive ? "Rule is active" : "Rule is disabled"}</Label>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push("/automation")}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-white shadow-sm hover:opacity-90 dark:bg-[#1A1A1A] font-medium text-xs rounded-lg" style={{ color: "var(--brand-color)", border: "1px solid rgba(var(--brand-color-rgb),0.24)", backgroundColor: "rgba(var(--brand-color-rgb),0.12)" }}>
            {saving ? "Saving..." : isEdit ? "Update Rule" : "Create Rule"}
          </Button>
        </div>
      </div>
    </div>
  );
}
