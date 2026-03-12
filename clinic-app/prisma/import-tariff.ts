/**
 * Import tariff data from SDH tariff card PDF.
 * Updates defaultMinFee and defaultMaxFee on matching operations.
 * Run: bun prisma/import-tariff.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Tariff data from PDF: [name, actualTariff (defaultMinFee), minRange, maxRange]
// Note: actualTariff is what we charge (stored as defaultMinFee in seed)
// minRange/maxRange is the acceptable tariff range
const TARIFF_DATA: { name: string; actualTariff: number; minRange: number; maxRange: number }[] = [
  // General
  { name: "Scaling", actualTariff: 2500, minRange: 1500, maxRange: 2000 },
  // Restorative
  { name: "Temp Filling", actualTariff: 1500, minRange: 1000, maxRange: 1500 },
  { name: "GIC Filling", actualTariff: 2000, minRange: 1500, maxRange: 2000 },
  { name: "Composite (Anterior)", actualTariff: 4500, minRange: 3000, maxRange: 4000 },
  { name: "Composite Filling (Posterior)", actualTariff: 2500, minRange: 1500, maxRange: 2000 },
  // Endodontics
  { name: "Root Canal Treatment", actualTariff: 7000, minRange: 5000, maxRange: 6000 },
  { name: "Re - Root Canal Treatment", actualTariff: 9000, minRange: 7000, maxRange: 8000 },
  { name: "Post Core Buildup", actualTariff: 3500, minRange: 2500, maxRange: 3000 },
  // Periodontics
  { name: "Splinting", actualTariff: 6500, minRange: 4000, maxRange: 5000 },
  { name: "Curettage", actualTariff: 20000, minRange: 15000, maxRange: 18000 },
  { name: "Laser Curettage", actualTariff: 30000, minRange: 20000, maxRange: 25000 },
  { name: "Flap Surgery", actualTariff: 30000, minRange: 20000, maxRange: 25000 },
  { name: "Laser Flap Surgery", actualTariff: 45000, minRange: 30000, maxRange: 40000 },
  { name: "Crown Lengthening", actualTariff: 3500, minRange: 2500, maxRange: 3000 },
  // Prosthodontics
  { name: "Temporary Crown", actualTariff: 2000, minRange: 1500, maxRange: 2000 },
  { name: "Ceramic Crown - PFM", actualTariff: 7000, minRange: 5000, maxRange: 6000 },
  { name: "Ceramic Crown - DMLS", actualTariff: 10000, minRange: 7000, maxRange: 9000 },
  { name: "All Ceramic Crown (Monolith)", actualTariff: 12000, minRange: 8000, maxRange: 10000 },
  { name: "All Ceramic Crown (Zirconia 15 years)", actualTariff: 15000, minRange: 10000, maxRange: 13000 },
  { name: "Veneers", actualTariff: 17000, minRange: 12000, maxRange: 15000 },
  { name: "RPD (per unit)", actualTariff: 2000, minRange: 1500, maxRange: 2000 },
  { name: "RPD Flexible (per unit)", actualTariff: 4500, minRange: 3000, maxRange: 4000 },
  { name: "Complete Denture (Regular)", actualTariff: 30000, minRange: 20000, maxRange: 25000 },
  { name: "Complete Denture (Single Arch)", actualTariff: 16000, minRange: 12000, maxRange: 14000 },
  { name: "Complete Denture (High Impact)", actualTariff: 40000, minRange: 28000, maxRange: 35000 },
  { name: "Complete Denture (High Impact Single Arch)", actualTariff: 20000, minRange: 15000, maxRange: 18000 },
  { name: "BPS (CD)", actualTariff: 50000, minRange: 35000, maxRange: 45000 },
  { name: "BPS (CD) (Single Arch)", actualTariff: 25000, minRange: 18000, maxRange: 22000 },
  { name: "Crown Removal (per unit)", actualTariff: 2000, minRange: 1000, maxRange: 1500 },
  { name: "Crown Cementation (per unit)", actualTariff: 2000, minRange: 1000, maxRange: 1500 },
  // Surgery
  { name: "Extraction", actualTariff: 2500, minRange: 1500, maxRange: 2000 },
  { name: "Surgical Extraction", actualTariff: 3500, minRange: 2500, maxRange: 3000 },
  { name: "Impaction", actualTariff: 6500, minRange: 4000, maxRange: 5000 },
  { name: "Apicectomy", actualTariff: 6500, minRange: 4000, maxRange: 5000 },
  { name: "Frenectomy", actualTariff: 6500, minRange: 4000, maxRange: 5000 },
  { name: "Biopsy", actualTariff: 6500, minRange: 4000, maxRange: 5000 },
  // Orthodontics
  { name: "Night Guard", actualTariff: 5500, minRange: 3500, maxRange: 5000 },
  { name: "Retainer (each arch)", actualTariff: 5500, minRange: 3500, maxRange: 5000 },
  { name: "Appliances", actualTariff: 8500, minRange: 6000, maxRange: 8000 },
  { name: "St Wire - Metal", actualTariff: 50000, minRange: 35000, maxRange: 45000 },
  { name: "St Wire - Ceramic", actualTariff: 65000, minRange: 45000, maxRange: 55000 },
  { name: "St Wire - Damon Metal", actualTariff: 85000, minRange: 60000, maxRange: 75000 },
  { name: "St Wire - Damon Ceramic", actualTariff: 95000, minRange: 70000, maxRange: 85000 },
  { name: "Aligners - Invisalign", actualTariff: 400000, minRange: 250000, maxRange: 350000 },
  { name: "Aligners - Illusion", actualTariff: 300000, minRange: 200000, maxRange: 250000 },
  // Implants
  { name: "Implant - Dentium (Excluding Crown)", actualTariff: 35000, minRange: 25000, maxRange: 35000 },
  { name: "Screw retained PFM Crown", actualTariff: 12500, minRange: 8000, maxRange: 10000 },
  { name: "Screw retained Zirconia Crown", actualTariff: 15500, minRange: 10000, maxRange: 13000 },
  { name: "Cement retained PFM Crown", actualTariff: 8500, minRange: 6000, maxRange: 8000 },
  { name: "Cement retained Zirconia Crown", actualTariff: 12500, minRange: 8000, maxRange: 10000 },
  // Pedo
  { name: "Extraction (Pedo)", actualTariff: 1500, minRange: 800, maxRange: 1200 },
  { name: "Space Maintainer", actualTariff: 8000, minRange: 5000, maxRange: 7000 },
  { name: "Pitt & Fissure Sealant", actualTariff: 2500, minRange: 1500, maxRange: 2000 },
  { name: "Pulpectomy", actualTariff: 4000, minRange: 2500, maxRange: 3500 },
  { name: "Pulpotomy", actualTariff: 2500, minRange: 1500, maxRange: 2000 },
  { name: "S.S.Crown", actualTariff: 4000, minRange: 2500, maxRange: 3500 },
  { name: "Temp Filling (Pedo)", actualTariff: 1200, minRange: 800, maxRange: 1000 },
  { name: "GIC Filling (Pedo)", actualTariff: 1800, minRange: 1200, maxRange: 1500 },
  { name: "Composite Filling (Pedo)", actualTariff: 2500, minRange: 1500, maxRange: 2000 },
  { name: "Appliances (Pedo)", actualTariff: 8000, minRange: 5000, maxRange: 7000 },
];

async function main() {
  const allOps = await prisma.operation.findMany({ select: { id: true, name: true } });
  const opMap = new Map(allOps.map((op) => [op.name.toLowerCase(), op]));

  let matched = 0;
  let unmatched = 0;

  for (const tariff of TARIFF_DATA) {
    const op = opMap.get(tariff.name.toLowerCase());
    if (op) {
      await prisma.operation.update({
        where: { id: op.id },
        data: {
          defaultMinFee: tariff.actualTariff,
          defaultMaxFee: tariff.maxRange,
        },
      });
      matched++;
      console.log(`✓ ${tariff.name}: min=₹${tariff.actualTariff}, max=₹${tariff.maxRange}`);
    } else {
      unmatched++;
      console.log(`✗ UNMATCHED: "${tariff.name}"`);
    }
  }

  console.log(`\nDone. Matched: ${matched}, Unmatched: ${unmatched}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
