import { EnterpriseNavigation } from "@/components/enterprise-navigation";

export default function EnterpriseLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="border-b border-zinc-800 bg-[#04070c] px-6 py-3 text-white md:px-8">
        <EnterpriseNavigation />
      </div>
      {children}
    </>
  );
}
