import * as fs from "fs/promises";
import * as path from "path";

export async function* iterateFolder(
  folder: string,
  includeDirectories: boolean
): AsyncGenerator<string> {
  const dir = await fs.opendir(folder, { bufferSize: 4000 });
  for await (const entry of dir) {
    const resolved = path.resolve(folder, entry.name);

    if (entry.isDirectory()) {
      if (includeDirectories) yield resolved;
      yield* iterateFolder(resolved, includeDirectories);
    } else {
      yield resolved;
    }
  }
}
