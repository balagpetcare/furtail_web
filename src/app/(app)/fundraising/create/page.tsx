"use client";

import React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  fundraisingApi,
  fundraisingKeys,
  FUNDRAISING_CATEGORIES,
  FUNDRAISING_BENEFICIARY_TYPES,
} from "@/lib/api/fundraising";
import { ApiError } from "@/lib/api-error";

export default function CreateCampaignPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: fundraisingApi.createCampaign,
    onSuccess: (campaign) => {
      toast.success("Campaign submitted for review");
      queryClient.invalidateQueries({ queryKey: fundraisingKeys.my() });
      router.push(`/fundraising/${campaign.id}`);
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Failed to create campaign");
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const goalDollars = Number(formData.get("goal"));
    const deadline = String(formData.get("deadline") || "");

    if (!goalDollars || goalDollars <= 0) {
      toast.error("Enter a valid fundraising goal");
      return;
    }
    if (!deadline) {
      toast.error("Choose a campaign deadline");
      return;
    }

    createMutation.mutate({
      title: String(formData.get("title") || ""),
      caption: String(formData.get("caption") || ""),
      category: String(formData.get("category") || ""),
      beneficiaryType: String(formData.get("beneficiaryType") || ""),
      beneficiaryName: String(formData.get("beneficiaryName") || ""),
      fundingMode: "ONE_TIME",
      targetAmountMinor: Math.round(goalDollars * 100),
      deadline: new Date(deadline).toISOString(),
    });
  };

  return (
    <div className="py-6 px-4 sm:px-0 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/fundraising" className="text-gray-500 hover:text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Start a Campaign</h1>
      </div>

      <Card className="p-6 rounded-3xl border border-gray-100 shadow-sm">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" name="title" required placeholder="Help Luna recover from surgery" className="rounded-xl h-12" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="caption">Story</Label>
            <Textarea
              id="caption"
              name="caption"
              required
              placeholder="Tell donors what happened and how their support will help..."
              className="rounded-xl min-h-[140px] resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select name="category" required>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {FUNDRAISING_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="beneficiaryType">Who is this for?</Label>
              <Select name="beneficiaryType" required>
                <SelectTrigger className="w-full rounded-xl">
                  <SelectValue placeholder="Select beneficiary" />
                </SelectTrigger>
                <SelectContent>
                  {FUNDRAISING_BENEFICIARY_TYPES.map((b) => (
                    <SelectItem key={b.value} value={b.value}>
                      {b.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="beneficiaryName">Beneficiary Name</Label>
            <Input id="beneficiaryName" name="beneficiaryName" required placeholder="Luna" className="rounded-xl h-12" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="goal">Goal (USD)</Label>
              <Input id="goal" name="goal" type="number" min="1" step="1" required placeholder="1000" className="rounded-xl h-12" />
            </div>

            <div className="space-y-2">
              <Label htmlFor="deadline">Deadline</Label>
              <Input id="deadline" name="deadline" type="date" required className="rounded-xl h-12" />
            </div>
          </div>

          <p className="text-xs text-gray-500">
            Your campaign will be submitted for review before it appears publicly. You can add
            photos after it&apos;s created.
          </p>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <Button
              type="submit"
              className="px-8 h-12 rounded-full bg-purple-600 hover:bg-purple-700 font-semibold"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Submitting..." : "Submit Campaign"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
