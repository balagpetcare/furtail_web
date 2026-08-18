"use client";

import React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { fundraisingApi, fundraisingKeys } from "@/lib/api/fundraising";

/**
 * Never renders a status derived from the URL — `?status=...` (if EPS or
 * any other caller lands here with one) is decorative only. The only
 * trusted signal is a fresh, authenticated `GET
 * /fundraising/payments/:referenceId/status` call, matching the backend's
 * own rule that a browser redirect outcome is never proof of payment.
 */
export default function PaymentStatusPage() {
  const searchParams = useSearchParams();
  const referenceId = searchParams.get("ref") || searchParams.get("referenceId") || "";

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: fundraisingKeys.paymentStatus(referenceId),
    queryFn: () => fundraisingApi.getPaymentStatus(referenceId),
    enabled: !!referenceId,
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "PENDING" || status === "PENDING_VERIFICATION" ? 4000 : false;
    },
  });

  if (!referenceId) {
    return (
      <div className="py-16 px-4 text-center max-w-md mx-auto">
        <XCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold text-gray-900 mb-2">Missing payment reference</h1>
        <p className="text-gray-500 mb-6">We couldn&apos;t find a payment to check the status of.</p>
        <Link href="/fundraising"><Button>Back to Fundraising</Button></Link>
      </div>
    );
  }

  const status = data?.status;
  const isSuccess = status === "SUCCEEDED" || status === "SUCCESS" || status === "COMPLETED";
  const isFailed = status === "FAILED" || status === "CANCELLED";
  const isPending = !isSuccess && !isFailed;

  return (
    <div className="py-16 px-4 max-w-md mx-auto text-center">
      <Card className="p-8 rounded-3xl border border-gray-100 shadow-sm">
        {isLoading ? (
          <Skeleton className="w-full h-40 rounded-2xl" />
        ) : error ? (
          <>
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Couldn&apos;t verify payment</h1>
            <p className="text-gray-500 mb-6">Please check your donation history in a moment.</p>
            <Button onClick={() => refetch()} disabled={isRefetching}>Try again</Button>
          </>
        ) : isSuccess ? (
          <>
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Thank you!</h1>
            <p className="text-gray-500 mb-6">Your donation was verified and processed successfully.</p>
            <Link href="/fundraising"><Button>Back to Fundraising</Button></Link>
          </>
        ) : isFailed ? (
          <>
            <XCircle className="w-14 h-14 text-red-500 mx-auto mb-4" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Payment not completed</h1>
            <p className="text-gray-500 mb-6">Your donation wasn&apos;t processed. No charge was made.</p>
            <Link href="/fundraising"><Button>Back to Fundraising</Button></Link>
          </>
        ) : (
          <>
            <Clock className="w-14 h-14 text-amber-500 mx-auto mb-4 animate-pulse" />
            <h1 className="text-xl font-bold text-gray-900 mb-2">Verifying payment...</h1>
            <p className="text-gray-500">This usually takes a few seconds.</p>
          </>
        )}
      </Card>
    </div>
  );
}
