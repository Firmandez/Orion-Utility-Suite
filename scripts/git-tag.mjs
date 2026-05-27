import fs from "fs";
import { execSync } from "child_process";

try {
  // 1. Membaca versi dari package.json
  const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf8"));
  const version = packageJson.version;
  const tagName = `v${version}`;

  console.log(`\x1b[36m[Orion Git Tag Manager]\x1b[0m`);
  console.log(`Versi di package.json : \x1b[35m${version}\x1b[0m`);
  console.log(`Target Tag Git        : \x1b[35m${tagName}\x1b[0m\n`);

  // 2. Memeriksa apakah ada perubahan yang belum di-commit
  const statusOutput = execSync("git status --porcelain", { encoding: "utf8" }).trim();
  if (statusOutput) {
    console.warn(`\x1b[33mPeringatan: Ada perubahan kode yang belum di-commit!\x1b[0m`);
    console.warn(`Disarankan untuk melakukan commit dan push ke 'main' terlebih dahulu.`);
    console.log(`Menjalankan git status untuk meninjau...`);
    execSync("git status", { stdio: "inherit" });
    console.log("");
  }

  // 3. Memeriksa apakah tag lokal sudah ada
  let tagExistsLocally = false;
  try {
    const existingTags = execSync("git tag", { encoding: "utf8" });
    if (existingTags.split("\n").map(t => t.trim()).includes(tagName)) {
      tagExistsLocally = true;
    }
  } catch (err) {
    console.error("Gagal memeriksa tag lokal:", err.message);
  }

  if (tagExistsLocally) {
    console.log(`\x1b[33mPeringatan: Tag ${tagName} sudah terdaftar secara lokal.\x1b[0m`);
    console.log("Jika Anda ingin merilis ulang versi ini, hapus tag lokal & remote terlebih dahulu:");
    console.log(`  git tag -d ${tagName}`);
    console.log(`  git push origin --delete ${tagName}`);
    process.exit(0);
  }

  // 4. Membuat tag lokal
  console.log(`Membuat tag baru: \x1b[32m${tagName}\x1b[0m...`);
  execSync(`git tag ${tagName}`, { stdio: "inherit" });

  // 5. Mendorong tag ke GitHub (origin)
  console.log(`Mendorong tag \x1b[32m${tagName}\x1b[0m ke origin...`);
  execSync(`git push origin ${tagName}`, { stdio: "inherit" });

  console.log(`\n\x1b[32m✓ Sukses! Tag ${tagName} berhasil dibuat dan dipush ke GitHub!\x1b[0m`);
  console.log(`Sistem GitHub Actions kini akan otomatis memproses kompilasi rilis Anda.`);
} catch (error) {
  console.error("\n\x1b[31m[Error]\x1b[0m Gagal membuat atau mendorong tag Git:", error.message);
  process.exit(1);
}
