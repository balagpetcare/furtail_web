"use client";

import React, { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { reportsApi, type ReportType } from "@/lib/api/reports";
import { ApiError } from "@/lib/api-error";

interface ReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: ReportType;
  targetId: number;
}

export function ReportDialog({ open, onOpenChange, type, targetId }: ReportDialogProps) {
  const [reasonCode, setReasonCode] = useState("");
  const [details, setDetails] = useState("");

  const { data: reasons } = useQuery({
    queryKey: ["reports", "reasons", type],
    queryFn: () => reportsApi.getReasons(type),
    enabled: open,
  });

  const submitMutation = useMutation({
    mutationFn: () => reportsApi.createReport({ type, targetId, reasonCode, details: details || undefined }),
    onSuccess: () => {
      toast.success("Report submitted. Thank you for helping keep Furtail safe.");
      onOpenChange(false);
      setReasonCode("");
      setDetails("");
    },
    onError: (error: unknown) => {
      toast.error(error instanceof ApiError ? error.message : "Failed to submit report");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-3xl p-6">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Report</DialogTitle>
          <DialogDescription className="text-gray-500 pt-1 text-[15px]">
            Tell us what&apos;s wrong. Reports are reviewed by the Furtail team.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <Select onValueChange={(v: unknown) => setReasonCode(v ? String(v) : "")}>
            <SelectTrigger className="w-full rounded-xl">
              <SelectValue placeholder="Select a reason" />
            </SelectTrigger>
            <SelectContent>
              {reasons?.items.map((r) => (
                <SelectItem key={r.code} value={r.code}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea
            placeholder="Additional details (optional)"
            className="resize-none rounded-xl h-24"
            value={details}
            onChange={(e) => setDetails(e.target.value)}
          />
        </div>
        <Button
          className="w-full h-12 rounded-xl font-bold bg-red-600 hover:bg-red-700 text-white"
          onClick={() => submitMutation.mutate()}
          disabled={!reasonCode || submitMutation.isPending}
        >
          {submitMutation.isPending ? "Submitting..." : "Submit Report"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
