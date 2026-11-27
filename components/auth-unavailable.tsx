import Link from "next/link";
export function AuthUnavailable() {
 return <main className="mx-auto max-w-2xl px-6 py-20 text-white">
 <h1 className="text-3xl font-semibold">Sign-in is currently unavailable</h1>
 <p className="mt-4 text-zinc-300">This workspace requires configured authentication. Please try again later or contact us for access.</p>
 <nav aria-label="Available destinations" className="mt-6 flex flex-wrap gap-6"><Link href="/">Return to website</Link><Link href="/enterprise-access?intent=demo">Enquire about access</Link></nav>
 </main>;
}
