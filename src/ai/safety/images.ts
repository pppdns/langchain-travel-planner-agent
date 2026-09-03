import { SAFE_IMAGE_POLICY } from "@/src/ai/contracts/acceptance";

const MAGIC = {
  "image/jpeg": [0xff, 0xd8, 0xff],
  "image/png": [0x89, 0x50, 0x4e, 0x47],
  "image/webp": [0x52, 0x49, 0x46, 0x46],
} as const;

const REJECTED_HINTS = /passport|boarding pass|booking confirmation|id card|driver.?license|visa/i;

export function validateImageUpload(input: {
  mime: string;
  bytes: Uint8Array;
  fileName: string;
}): { ok: true } | { ok: false; reason: string } {
  if (SAFE_IMAGE_POLICY.rejected.includes(input.mime)) {
    return { ok: false, reason: "This file type is not allowed." };
  }
  if (!SAFE_IMAGE_POLICY.mime.includes(input.mime as (typeof SAFE_IMAGE_POLICY.mime)[number])) {
    return { ok: false, reason: "Only JPEG, PNG, or WebP scenery images are accepted." };
  }
  if (input.bytes.byteLength > SAFE_IMAGE_POLICY.maxBytes) {
    return { ok: false, reason: "Each image must be 2 MB or smaller." };
  }
  if (/\.(pdf|svg|html|js)$/i.test(input.fileName)) {
    return { ok: false, reason: "Active or document formats are rejected." };
  }
  if (REJECTED_HINTS.test(input.fileName)) {
    return { ok: false, reason: "Identity and booking documents are not accepted." };
  }
  const expected = MAGIC[input.mime as keyof typeof MAGIC];
  const header = Array.from(input.bytes.slice(0, expected.length));
  if (expected.some((value, index) => header[index] !== value)) {
    return { ok: false, reason: "The file bytes do not match the declared image type." };
  }
  return { ok: true };
}

export function shouldDiscardSensitiveCaption(text: string): boolean {
  return REJECTED_HINTS.test(text);
}

export function sceneryObservation(fileName: string) {
  const coastal = /beach|coast|harbor|sea|promenade/i.test(fileName);
  return {
    visible: coastal ? ["water", "open sky", "shoreline"] : ["outdoor scenery", "ambient light"],
    atmosphere: coastal
      ? "Coastal and informal. Useful as a vibe, not as a booking fact."
      : "Warm, informal stay. Useful as a vibe, not as a booking fact.",
    notInferred: ["hotel rating", "nightly price", "availability"],
  };
}
