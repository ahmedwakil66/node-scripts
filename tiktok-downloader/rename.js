const fs = require("fs");
const path = require("path");

const prefix = "thegreatpenetrator";
const startingNumber = 163;

const directory = __dirname;

const mp4Files = fs
  .readdirSync(directory, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".mp4"))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));

const targetNames = mp4Files.map(
  (_, index) => `${prefix}_${startingNumber + index}.mp4`
);

const sourceSet = new Set(mp4Files.map((name) => path.resolve(directory, name)));
const conflicts = targetNames.filter((name) => {
  const targetPath = path.resolve(directory, name);
  return fs.existsSync(targetPath) && !sourceSet.has(targetPath);
});

if (conflicts.length > 0) {
  console.error("Rename aborted. These target files already exist:");
  conflicts.forEach((name) => console.error(`- ${name}`));
  process.exit(1);
}

const tempNames = mp4Files.map(
  (name, index) => `__rename_tmp_${Date.now()}_${index}_${name}`
);

mp4Files.forEach((name, index) => {
  fs.renameSync(path.join(directory, name), path.join(directory, tempNames[index]));
});

tempNames.forEach((name, index) => {
  fs.renameSync(path.join(directory, name), path.join(directory, targetNames[index]));
});

console.log(`Renamed ${mp4Files.length} .mp4 file(s).`);
console.log(`First: ${targetNames[0] || "none"}`);
console.log(`Last: ${targetNames[targetNames.length - 1] || "none"}`);
