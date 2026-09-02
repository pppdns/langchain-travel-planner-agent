import { NextResponse } from "next/server";
import { SAFE_IMAGE_POLICY } from "@/src/ai/contracts/acceptance";
import { validateImageUpload } from "@/src/ai/safety/images";
import { getEnv } from "@/src/lib/env";
import { assertHumanRequest } from "@/src/lib/botid";
import { getSessionUserId, getStoredTrip, saveStoredTrip } from "@/src/lib/trips/store";

export const dynamic = "force-dynamic";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await assertHumanRequest();
  } catch {
    return NextResponse.json({ error: "Bot traffic blocked" }, { status: 403 });
  }

  const env = getEnv();
  if (env.UPLOADS_DISABLED === "true") {
    return NextResponse.json({ error: "Uploads are disabled." }, { status: 503 });
  }

  const { id } = await context.params;
  const userId = await getSessionUserId();
  const trip = await getStoredTrip(id, userId);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const check = validateImageUpload({ mime: file.type, bytes, fileName: file.name });
  if (!check.ok) {
    return NextResponse.json({ error: check.reason }, { status: 400 });
  }

  trip.messages.push({
    role: "assistant",
    content: `Image received (${file.type}, ${(bytes.byteLength / 1024).toFixed(0)} KB). I will only keep scenery or hotel-atmosphere observations.`,
  });
  await saveStoredTrip(trip);

  return NextResponse.json({
    accepted: true,
    policy: SAFE_IMAGE_POLICY,
  });
}
