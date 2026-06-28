"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

const receiptIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function ReceiptVerificationForm() {
  const router = useRouter();
  const [receiptId, setReceiptId] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = receiptId.trim();
    if (!receiptIdPattern.test(value)) {
      setError("Enter a valid verification receipt ID.");
      return;
    }
    setError(null);
    router.push(`/verification/receipt/${encodeURIComponent(value)}`);
  }

  return (
    <form onSubmit={submit} className="mt-5 flex max-w-2xl flex-col gap-3 sm:flex-row">
      <label className="sr-only" htmlFor="receipt-id">Verification receipt ID</label>
      <input
        id="receipt-id"
        value={receiptId}
        onChange={(event) => setReceiptId(event.target.value)}
        placeholder="Verification receipt ID"
        className="min-w-0 flex-1 rounded-lg border border-zinc-700 bg-black px-4 py-3 text-sm text-white placeholder:text-zinc-500"
      />
      <button className="rounded-lg bg-cyan-300 px-5 py-3 text-sm font-semibold text-zinc-950 hover:bg-cyan-200">
        Verify Receipt
      </button>
      {error ? <p className="text-sm text-red-200 sm:basis-full">{error}</p> : null}
    </form>
  );
}

