import { notFound } from "next/navigation";
import { ReplayViewer } from "@/components/replay-viewer";
import { createClient } from "@/lib/supabase/server";
import { ReplayService } from "@/src/core/trust/replay";
import { createReplayRepository } from "@/src/core/trust/replay/supabase-repository";
import { trustArchitectureUiContext } from "@/src/lib/trust-architecture/ui-context";

export const dynamic = "force-dynamic";

export default async function ReplayEntityPage({
  params,
}: {
  params: Promise<{ entityId: string }>;
}) {
  const entityId = (await params).entityId;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(entityId)) {
    notFound();
  }
  const { workspace } = await trustArchitectureUiContext(
    `/dashboard/replay/${encodeURIComponent(entityId)}`,
  );
  if (!workspace) notFound();
  const supabase = await createClient();
  const timeline = await new ReplayService(
    createReplayRepository(supabase),
  ).timeline(workspace.id, entityId, { limit: 500 });
  return (
    <main className="min-h-screen bg-[#04070c] px-5 py-10 text-white">
      <div className="mx-auto max-w-7xl">
        <ReplayViewer
          enterpriseId={workspace.id}
          entityId={entityId}
          initialTimeline={timeline}
        />
      </div>
    </main>
  );
}
