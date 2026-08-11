import { access, readFile } from "node:fs/promises";

const requiredAssets = [
  {
    asset: "public/images/petra-admissions-transformation-transparent.webp",
    page: "src/app/(marketing)/admissions/page.tsx",
    reference: "/images/petra-admissions-transformation-transparent.webp",
  },
];

let failed = false;

for (const requirement of requiredAssets) {
  try {
    await access(requirement.asset);
    const page = await readFile(requirement.page, "utf8");

    if (!page.includes(requirement.reference)) {
      console.error(
        `Required website image ${requirement.reference} is not used by ${requirement.page}.`,
      );
      failed = true;
    }
  } catch (error) {
    console.error(
      `Required website image check failed for ${requirement.asset}: ${error instanceof Error ? error.message : String(error)}`,
    );
    failed = true;
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.info("Required website images are present and connected to their pages.");
}
