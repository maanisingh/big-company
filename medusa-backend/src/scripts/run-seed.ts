import { MedusaContainer } from "@medusajs/medusa/dist/types/global";
import express from "express";
import { getConfigFile } from "medusa-core-utils";
import loaders from "@medusajs/medusa/dist/loaders";
import seedProducts from "./seed-products";

async function main() {
  const app = express();
  const { configModule } = getConfigFile(process.cwd(), "medusa-config");

  const { container } = await loaders({
    directory: process.cwd(),
    expressApp: app,
    isTest: false,
  });

  await seedProducts(container);
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
