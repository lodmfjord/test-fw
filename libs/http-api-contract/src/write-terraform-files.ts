import { mkdir, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

async function removeLegacyMainTerraformFile(
  outputDirectory: string,
  generatedFileNames: ReadonlyArray<string>,
): Promise<void> {
  if (generatedFileNames.includes("main.tf.json")) {
    return;
  }

  try {
    await unlink(join(outputDirectory, "main.tf.json"));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function writeTerraformFiles(
  outputDirectory: string,
  files: Record<string, string>,
): Promise<string[]> {
  const directory = outputDirectory.trim();
  if (directory.length === 0) {
    throw new Error("terraform outputDirectory is required");
  }

  await mkdir(directory, { recursive: true });
  const fileNames = Object.keys(files).sort((left, right) => left.localeCompare(right));
  await removeLegacyMainTerraformFile(directory, fileNames);
  for (const fileName of fileNames) {
    const source = files[fileName];
    if (source === undefined) {
      continue;
    }

    await writeFile(join(directory, fileName), source, "utf8");
  }

  return fileNames;
}
