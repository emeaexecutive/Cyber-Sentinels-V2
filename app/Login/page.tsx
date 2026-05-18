"use client";

import { useState } from "react";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  async function signIn() {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          window.location.origin + "/command-center",
      },
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage("Magic link sent.");
  }

  return (
    <main className="min-h-screen bg-black p-8 text-white">
      <div className="mx-auto max-w-md">

        <h1 className="text-4xl font-bold">
          Sentinel Login
        </h1>

        <p className="mt-4 text-zinc-400">
          Access Cyber Sentinels Command Center
        </p>

        <div className="mt-8 grid gap-4">

          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="rounded-xl border border-zinc-800 bg-black p-4"
          />

          <button
            onClick={signIn}
            className="rounded-xl bg-white p-4 font-semibold text-black"
          >
            Send Magic Link
          </button>

          {message && (
            <p className="text-zinc-400">
              {message}
            </p>
          )}

        </div>

      </div>
    </main>
  );
}
