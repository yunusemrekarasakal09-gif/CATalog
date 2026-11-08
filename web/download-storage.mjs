import { createClient } from "@supabase/supabase-js";
import fs from "node:fs/promises";
import path from "node:path";

const envPath = "C:\\CAT-ALOG\\web\\.env.local";
const outputDir = path.join(
  process.env.USERPROFILE,
  "CAT-ALOG-Backups",
  "Storage"
);

async function loadEnv() {
  const content = await fs.readFile(envPath, "utf8");
  const env = {};

  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match) {
      env[match[1]] = match[2].replace(/^["']|["']$/g, "");
    }
  }

  return env;
}

async function main() {
  const env = await loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    env.SUPABASE_SERVICE_ROLE_KEY ||
    env.SUPABASE_SECRET_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !key) {
    throw new Error(".env.local icinde Supabase URL veya anahtar bulunamadi.");
  }

  const supabase = createClient(url, key);
  await fs.mkdir(outputDir, { recursive: true });

  let downloaded = 0;
  let failed = 0;

  async function walk(folder = "") {
    const { data, error } = await supabase.storage
      .from("cat-photos")
      .list(folder, { limit: 1000 });

    if (error) {
      throw new Error(`Klasor listelenemedi (${folder || "/"}): ${error.message}`);
    }

    for (const item of data ?? []) {
      if (item.name === ".emptyFolderPlaceholder") continue;

      const relativePath = folder
        ? `${folder}/${item.name}`
        : item.name;

      if (!item.id) {
        await walk(relativePath);
        continue;
      }

      const { data: file, error: downloadError } = await supabase.storage
        .from("cat-photos")
        .download(relativePath);

      if (downloadError || !file) {
        failed++;
        console.error("Indirilemedi:", relativePath, downloadError?.message);
        continue;
      }

      const destination = path.join(outputDir, ...relativePath.split("/"));
      await fs.mkdir(path.dirname(destination), { recursive: true });
      await fs.writeFile(destination, Buffer.from(await file.arrayBuffer()));

      downloaded++;
      console.log("Indirildi:", relativePath);
    }
  }

  await walk();

  console.log(`\nTamamlandi. Indirilen: ${downloaded}, basarisiz: ${failed}`);
  console.log(`Yedek klasoru: ${outputDir}`);

  if (failed > 0) process.exitCode = 1;
}

main().catch((error) => {
  console.error("Yedekleme hatasi:", error.message);
  process.exitCode = 1;
});