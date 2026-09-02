import { RouteStateWorkspace } from "@/src/features/workspace/RouteStateWorkspace";
import { starterIdSchema } from "@/src/ai/contracts/http";

export const dynamic = "force-dynamic";

export default async function ReplayPage({ params }: { params: Promise<{ starter: string }> }) {
  const { starter } = await params;
  const parsed = starterIdSchema.safeParse(starter);
  return <RouteStateWorkspace initialReplay={parsed.success ? parsed.data : "family-beach-europe"} />;
}
