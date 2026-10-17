// A credencial S3 existe só na CI. Objetos versionados são imutáveis e latest muda por último.
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { compareVersions, parseTag } from "./version.mjs";

const digest = (body) => createHash("sha256").update(body).digest("hex");
export function releaseFiles(directory, version) {
  const allowed =
    /^(azuos-agent-\d+\.\d+\.\d+-x64\.msi|publisher\.cer|install-certificate\.ps1|configure-machine\.ps1|latest\.json|SHA256SUMS)$/;
  const names = readdirSync(directory);
  if (names.some((name) => !allowed.test(name)))
    throw new Error("Unexpected file in release directory");
  const files = new Map(
    names.map((name) => [name, readFileSync(resolve(directory, name))]),
  );
  for (const name of [
    `azuos-agent-${version}-x64.msi`,
    "publisher.cer",
    "install-certificate.ps1",
    "configure-machine.ps1",
    "latest.json",
    "SHA256SUMS",
  ]) {
    if (!files.has(name)) throw new Error(`Missing release artifact: ${name}`);
  }
  const manifest = JSON.parse(files.get("latest.json").toString("utf8"));
  if (manifest.version !== version)
    throw new Error("Artifact and tag versions differ");
  for (const [type, file] of [
    ["msi", `azuos-agent-${version}-x64.msi`],
    ["certificate", "publisher.cer"],
  ]) {
    const artifact = manifest.artifacts?.[type];
    const body = files.get(file);
    if (
      artifact?.key !== `agent/releases/${version}/${file}` ||
      artifact.sizeBytes !== body.length ||
      artifact.sha256 !== digest(body)
    )
      throw new Error(`Invalid integrity metadata: ${file}`);
  }
  return { files, manifest };
}

// I/O injetável para conferir retry e falha parcial sem tocar num bucket real.
export async function publish(directory, version, get, put) {
  const { files, manifest } = releaseFiles(directory, version);
  const previous = await get("agent/latest.json");
  if (
    previous &&
    compareVersions(JSON.parse(previous.toString("utf8")).version, version) > 0
  )
    throw new Error("Refusing to replace a newer release");
  for (const [name, body] of files) {
    const key = `agent/releases/${version}/${name}`;
    const existing = await get(key);
    if (existing && !existing.equals(body))
      throw new Error(`Release archive is immutable: ${key}`);
  }
  for (const [name, body] of files)
    await put(`agent/releases/${version}/${name}`, body, true);
  await put("agent/latest.json", Buffer.from(JSON.stringify(manifest)), false);
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
  const { version } = parseTag(process.env.RELEASE_TAG);
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
  const types = {
    msi: "application/octet-stream",
    cer: "application/pkix-cert",
    ps1: "text/plain",
    json: "application/json",
  };
  const get = async (key) => {
    try {
      const result = await client.send(
        new GetObjectCommand({ Bucket, Key: key }),
      );
      return Buffer.from(await result.Body.transformToByteArray());
    } catch (error) {
      if (error.name === "NoSuchKey") return null;
      throw error;
    }
  };
  const put = async (key, body, immutable) =>
    client.send(
      new PutObjectCommand({
        Bucket,
        Key: key,
        Body: body,
        ContentType: types[key.split(".").at(-1)] ?? "text/plain",
        CacheControl: immutable
          ? "private, max-age=31536000, immutable"
          : "no-store",
      }),
    );
  try {
    await publish(resolve("release"), version, get, put);
  } finally {
    client.destroy();
  }
}
if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(resolve(process.argv[1])).href
)
  await main();
