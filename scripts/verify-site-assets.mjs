import { access, readFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const sourceRoots = [
  "src/app/(marketing)",
  "src/components/marketing",
];

const requiredPublicPages = [
  "src/app/(marketing)/page.tsx",
  "src/app/(marketing)/about/page.tsx",
  "src/app/(marketing)/programs/page.tsx",
  "src/app/(marketing)/admissions/page.tsx",
  "src/app/(marketing)/news/page.tsx",
  "src/app/(marketing)/contact/page.tsx",
  "src/app/(marketing)/book-visit/page.tsx",
  "src/app/(marketing)/apply/page.tsx",
  "src/app/login/page.tsx",
];

const requiredPlacements = [
  {
    page: "src/app/(marketing)/admissions/page.tsx",
    reference: "/images/petra-admissions-transformation-transparent.webp",
  },
  {
    page: "src/components/marketing/petra-life-slider.tsx",
    reference: "/images/petra-attentive-classroom.webp",
  },
  {
    page: "src/components/marketing/petra-life-slider.tsx",
    reference: "/images/petra-teacher-writing.webp",
  },
  {
    page: "src/components/marketing/petra-teaching-team-carousel.tsx",
    reference: "/images/petra-staff-team.webp",
  },
  {
    page: "src/components/marketing/petra-teaching-team-carousel.tsx",
    reference: "/images/petra-staff-courtyard.webp",
  },
];

async function collectSourceFiles(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await collectSourceFiles(path)));
    if (entry.isFile() && /\.(?:tsx|ts|jsx|js)$/.test(entry.name)) files.push(path);
  }

  return files;
}

function hasValidImageSignature(buffer, asset) {
  if (buffer.length < 32) return false;
  if (asset.endsWith(".webp")) {
    return buffer.subarray(0, 4).toString("ascii") === "RIFF"
      && buffer.subarray(8, 12).toString("ascii") === "WEBP";
  }
  if (asset.endsWith(".png")) {
    return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  }
  if (/\.jpe?g$/i.test(asset)) {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer.at(-2) === 0xff && buffer.at(-1) === 0xd9;
  }
  if (asset.endsWith(".svg")) {
    return buffer.toString("utf8", 0, Math.min(buffer.length, 512)).includes("<svg");
  }
  return true;
}

let failed = false;

for (const page of requiredPublicPages) {
  try {
    await access(page);
  } catch {
    console.error(`Required public website page is missing: ${page}`);
    failed = true;
  }
}

for (const placement of requiredPlacements) {
  try {
    const page = await readFile(placement.page, "utf8");
    if (!page.includes(placement.reference)) {
      console.error(
        `Approved image ${placement.reference} is missing from ${placement.page}.`,
      );
      failed = true;
    }
  } catch (error) {
    console.error(
      `Approved image placement check failed for ${placement.page}: ${error instanceof Error ? error.message : String(error)}`,
    );
    failed = true;
  }
}

const sourceFiles = (
  await Promise.all(sourceRoots.map((root) => collectSourceFiles(root)))
).flat();
const imageReferences = new Map();

for (const sourceFile of sourceFiles) {
  const source = await readFile(sourceFile, "utf8");
  for (const match of source.matchAll(/["'](\/images\/[^"']+)["']/g)) {
    const reference = match[1];
    const pages = imageReferences.get(reference) ?? [];
    pages.push(sourceFile);
    imageReferences.set(reference, pages);
  }
}

for (const [reference, pages] of imageReferences) {
  const asset = join("public", reference);
  try {
    await access(asset);
    const image = await readFile(asset);
    if (!hasValidImageSignature(image, asset)) {
      throw new Error("the file does not contain a valid image signature");
    }
  } catch {
    console.error(
      `Website image ${reference} is referenced by ${pages.join(", ")} but ${asset} is missing or unreadable.`,
    );
    failed = true;
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.info(
    `Verified ${requiredPublicPages.length} public pages, ${requiredPlacements.length} approved placement and ${imageReferences.size} referenced website images.`,
  );
}
