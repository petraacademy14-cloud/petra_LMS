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
  } catch {
    console.error(
      `Website image ${reference} is referenced by ${pages.join(", ")} but ${asset} is missing.`,
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
