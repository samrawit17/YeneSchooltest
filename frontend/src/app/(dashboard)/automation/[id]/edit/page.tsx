"use client";

import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { automationAPI } from "@/lib/api/automation";
import RuleBuilder from "@/components/automation/RuleBuilder";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";

export default function EditAutomationRulePage() {
  const params = useParams();
  const ruleId = params.id as string;

  const { data, isLoading, error } = useQuery({
    queryKey: ["automation-rule", ruleId],
    queryFn: async () => (await automationAPI.getRule(ruleId)).data,
    enabled: !!ruleId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-[#111111]">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 p-6 dark:bg-[#111111]">
        <Card>
          <CardContent className="flex items-center gap-3 py-12 text-center">
            <AlertCircle className="h-8 w-8 text-red-500 mx-auto" />
            <p className="text-gray-500">Failed to load rule.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const initialData = {
    name: data.name,
    description: data.description || "",
    eventTrigger: data.eventTrigger,
    conditions: data.conditions || { operator: "AND" as const, conditions: [] },
    actions: (data.actions || []).map((a: any) => ({
      id: `edit_${a.type}_${Date.now()}`,
      type: a.type,
      config: a.config || {},
    })),
    isActive: data.isActive,
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-[#111111]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Edit Rule</h1>
        <p className="text-sm text-gray-500">{data.name}</p>
      </div>
      <RuleBuilder initialData={initialData} ruleId={ruleId} isEdit />
    </div>
  );
}
