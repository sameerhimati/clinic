/**
 * Import scanned patient files (X-rays, treatment cards, etc.)
 * from the clinic's ClinicScanned/ directory.
 *
 * Usage:
 *   bun prisma/import-scans.ts /path/to/ClinicScanned
 *
 * Structure expected:
 *   ClinicScanned/
 *     1234/          ← patient code
 *       xray.jpg
 *       scan.pdf
 *     5678/
 *       ...
 *
 * Files are NOT copied — they're referenced via a relative path.
 * Create a symlink: ln -s /path/to/ClinicScanned public/uploads/legacy-scans
 */

import { PrismaClient } from "@prisma/client";
import { readdirSync, statSync, existsSync } from "fs";
import { join, extname, basename } from "path";

const prisma = new PrismaClient();

// Auto-detect category from filename/extension
function detectCategory(fileName: string): string {
  const lower = fileName.toLowerCase();
  const ext = extname(lower);

  if (lower.includes("xray") || lower.includes("x-ray") || lower.includes("opg") || lower.includes("iopa") || lower.includes("rct")) {
    return "XRAY";
  }
  if (lower.includes("scan") || lower.includes("cbct") || lower.includes("ct")) {
    return "SCAN";
  }
  if (lower.includes("photo") || lower.includes("img") || lower.includes("pic")) {
    return "PHOTO";
  }
  if (ext === ".pdf" || ext === ".doc" || ext === ".docx" || ext === ".txt") {
    return "DOCUMENT";
  }
  if ([".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".gif"].includes(ext)) {
    return "XRAY"; // Default image files in dental context are likely X-rays
  }
  return "OTHER";
}

async function main() {
  const scanRoot = process.argv[2];
  if (!scanRoot) {
    console.error("Usage: bun prisma/import-scans.ts /path/to/ClinicScanned");
    process.exit(1);
  }

  if (!existsSync(scanRoot)) {
    console.error(`Directory not found: ${scanRoot}`);
    process.exit(1);
  }

  console.log(`Scanning: ${scanRoot}`);

  // Build a map of patient code → patient id
  const patients = await prisma.patient.findMany({
    where: { code: { not: null } },
    select: { id: true, code: true },
  });
  const codeToId = new Map<number, number>();
  for (const p of patients) {
    if (p.code != null) codeToId.set(p.code, p.id);
  }
  console.log(`Loaded ${codeToId.size} patients with codes`);

  // Get existing file paths to skip duplicates
  const existingFiles = await prisma.patientFile.findMany({
    select: { filePath: true },
  });
  const existingPaths = new Set(existingFiles.map((f) => f.filePath));

  // List patient folders
  const folders = readdirSync(scanRoot).filter((name) => {
    const fullPath = join(scanRoot, name);
    return statSync(fullPath).isDirectory();
  });

  let matched = 0;
  let unmatched = 0;
  let filesCreated = 0;
  let filesSkipped = 0;

  for (const folder of folders) {
    const code = parseInt(folder, 10);
    if (isNaN(code)) {
      unmatched++;
      continue;
    }

    const patientId = codeToId.get(code);
    if (!patientId) {
      unmatched++;
      continue;
    }

    matched++;
    const folderPath = join(scanRoot, folder);
    let files: string[];
    try {
      files = readdirSync(folderPath).filter((f) => {
        const fp = join(folderPath, f);
        return statSync(fp).isFile();
      });
    } catch {
      continue;
    }

    for (const file of files) {
      // Path relative to public/uploads/legacy-scans/
      const relativePath = `/uploads/legacy-scans/${folder}/${file}`;

      if (existingPaths.has(relativePath)) {
        filesSkipped++;
        continue;
      }

      const category = detectCategory(file);

      await prisma.patientFile.create({
        data: {
          patientId,
          filePath: relativePath,
          fileName: file,
          category,
          description: `Legacy scan: ${file}`,
        },
      });

      existingPaths.add(relativePath);
      filesCreated++;
    }
  }

  console.log(`\nResults:`);
  console.log(`  Patient folders matched: ${matched}`);
  console.log(`  Patient folders unmatched: ${unmatched}`);
  console.log(`  Files imported: ${filesCreated}`);
  console.log(`  Files skipped (duplicates): ${filesSkipped}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
