// Promover escolhe uma versão já publicada, sem recompilar ou apagar o histórico.
import { createRequire } from "node:module";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { pathToFileURL } from "node:url";
import { parseTag, compareVersions } from "./version.mjs";
import { releaseFiles } from "./publish-agent.mjs";

export async function promoteLts(tag, get, put) {
  const { component, version } = parseTag(tag);
  if (component !== "agent") throw new Error("Expected an agent/vX.Y.Z tag");
  const directory = mkdtempSync(join(tmpdir(), "agent-lts-"));
  try {
    for (const name of [
      `azuos-agent-${version}-x64.msi`,
      "publisher.cer",
      "install-certificate.ps1",
      "configure-machine.ps1",
      "latest.json",
      "SHA256SUMS",
    ]) {
      const body = await get(`agent/releases/${version}/${name}`);
      if (!body) throw new Error(`Missing release artifact: ${name}`);
      writeFileSync(join(directory, name), body);
    }
    const { manifest } = releaseFiles(directory, version);
    const previous = await get("agent/lts.json");
    if (
      previous &&
      compareVersions(JSON.parse(previous.toString("utf8")).version, version) >
        0
    )
      throw new Error("Refusing to downgrade LTS");
    await put("agent/lts.json", Buffer.from(JSON.stringify(manifest)));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
}

async function main() {
  const require = createRequire(
    resolve("chamados/dashboard/server/package.json"),
  );
  const {
    S3Client,
    GetObjectCommand,
    PutObjectCommand,
  } = require("@aws-sdk/client-s3");
  for (const name of [
    "S3_ENDPOINT",
    "S3_REGION",
    "S3_BUCKET",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
  ])
    if (!process.env[name]) throw new Error(`Missing ${name}`);
  const client = new S3Client({
    endpoint: process.env.S3_ENDPOINT,
    region: process.env.S3_REGION,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== "false",
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  });
  const Bucket = process.env.S3_BUCKET;
  const get = async (Key) => {
    try {
      const result = await client.send(new GetObjectCommand({ Bucket, Key }));
      return Buffer.from(await result.Body.transformToByteArray());
    } catch (error) {
      if (error.name === "NoSuchKey") return null;
      throw error;
    }
  };
  const put = (Key, Body) =>
    client.send(
      new PutObjectCommand({
        Bucket,
        Key,
        Body,
        ContentType: "application/json",
        CacheControl: "no-store",
      }),
    );
  try {
    await promoteLts(process.argv[2], get, put);
  } finally {
    client.destroy();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await main();
