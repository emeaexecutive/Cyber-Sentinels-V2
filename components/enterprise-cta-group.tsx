import Link from "next/link";
import { enterpriseCtas } from "@/lib/enterprise-experience";

const sharedActions = [
  enterpriseCtas.requestDemo,
  enterpriseCtas.bookPilot,
  enterpriseCtas.contactEnterprise,
];

export function EnterpriseCTAGroup({ label = "Enterprise next steps" }: { label?: string }) {
  return (
    <nav aria-label={label}>
      <ul className="grid gap-3 sm:flex sm:flex-wrap">
        {sharedActions.map((action, index) => (
          <li key={action.href}>
            <Link
              href={action.href}
              className={`${index === 0 ? "brand-primary-action" : "brand-secondary-action"} brand-action-large min-h-11 w-full text-sm sm:w-auto`}
            >
              {action.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
