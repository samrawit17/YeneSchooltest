"use client";

import RuleBuilder from "@/components/automation/RuleBuilder";

export default function CreateAutomationRulePage() {
  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-[#111111]">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-950 dark:text-white">Create Automation Rule</h1>
        <p className="text-sm text-gray-500">Define a trigger, optional conditions, and actions.</p>
      </div>
      <RuleBuilder />
    </div>
  );
}
