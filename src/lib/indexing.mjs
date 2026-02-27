import { createSign } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

function boolish(value, defaultValue = false) {
  const raw = String(value ?? "").trim().toLowerCase();
  if (!raw) return defaultValue;
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

function encodeBase64Url(input) {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function chunkArray(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function getGoogleAccessToken(serviceJsonPath) {
  const raw = await readFile(serviceJsonPath, "utf8");
  const creds = JSON.parse(raw);

  if (!creds.client_email || !creds.private_key || !creds.token_uri) {
    throw new Error("Invalid Google service JSON: missing client_email/private_key/token_uri");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const payload = {
    iss: creds.client_email,
    scope: "https://www.googleapis.com/auth/indexing",
    aud: creds.token_uri,
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = encodeBase64Url(JSON.stringify(header));
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const unsigned = `${encodedHeader}.${encodedPayload}`;
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const signature = signer.sign(creds.private_key);
  const assertion = `${unsigned}.${encodeBase64Url(signature)}`;

  const body = new URLSearchParams({
    grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    assertion,
  });

  const response = await fetch(creds.token_uri, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.access_token) {
    const message = data.error_description || data.error || `token request failed with ${response.status}`;
    throw new Error(`Google access token error: ${message}`);
  }

  return data.access_token;
}

export async function submitGoogleIndexing(urls, options = {}) {
  const {
    googleServiceEnabled = boolish(process.env.GOOGLE_SERVICE_ENABLED, false),
    googleServiceJsonPath = String(process.env.GOOGLE_SERVICE_JSON ?? "").trim(),
    notificationType = "URL_UPDATED",
    batchSize = 25,
    sleepBetweenBatchesMs = 4000,
    rootDir = process.cwd(),
    logger = console,
  } = options;

  if (!googleServiceEnabled) {
    logger.info("Google Indexing is disabled");
    return;
  }
  if (!Array.isArray(urls) || urls.length === 0) {
    return;
  }

  const candidates = [];
  if (googleServiceJsonPath) {
    candidates.push(path.isAbsolute(googleServiceJsonPath) ? googleServiceJsonPath : path.resolve(rootDir, googleServiceJsonPath));
  }
  candidates.push(path.resolve(rootDir, "google_indexing.json"));

  let token = "";
  let lastError = null;
  for (const candidate of candidates) {
    try {
      token = await getGoogleAccessToken(candidate);
      break;
    } catch (error) {
      lastError = error;
    }
  }
  if (!token) {
    throw lastError instanceof Error ? lastError : new Error("Unable to load Google service credentials");
  }

  const safeBatchSize = Number.isFinite(batchSize) && batchSize > 0 ? Math.floor(batchSize) : 25;
  const batches = chunkArray(urls, safeBatchSize);

  for (let i = 0; i < batches.length; i += 1) {
    const batch = batches[i];
    const results = await Promise.all(
      batch.map(async (url) => {
        const response = await fetch("https://indexing.googleapis.com/v3/urlNotifications:publish", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            url,
            type: notificationType,
          }),
        });

        if (!response.ok) {
          const body = await response.text();
          return { ok: false, url, status: response.status, body };
        }

        const data = await response.json().catch(() => ({}));
        const latestUpdate = data?.urlNotificationMetadata?.latestUpdate;
        return { ok: true, url, latestUpdate };
      }),
    );

    for (const result of results) {
      if (!result.ok) {
        logger.info(`Google Indexing error for ${result.url}: ${result.status} ${result.body}`);
        continue;
      }
      if (result.latestUpdate?.notifyTime) {
        logger.info(`${result.latestUpdate.notifyTime} - ${result.latestUpdate.type} - ${result.latestUpdate.url}`);
      } else {
        logger.info(`Google Indexing submitted: ${result.url}`);
      }
    }

    if (i < batches.length - 1 && sleepBetweenBatchesMs > 0) {
      await sleep(sleepBetweenBatchesMs);
    }
  }
}

export async function submitBingIndexNow(urls, baseUrl, options = {}) {
  const {
    nodeEnv = String(process.env.NODE_ENV ?? "").trim(),
    bingApiKey = String(process.env.BING_API_KEY ?? "").trim(),
    logger = console,
  } = options;

  if (!Array.isArray(urls) || urls.length === 0) {
    return;
  }

  if (!baseUrl) {
    logger.info("Bing IndexNow skipped (missing base URL)");
    return;
  }

  if (nodeEnv !== "production" || !bingApiKey) {
    logger.info("Bing IndexNow skipped (requires NODE_ENV=production and BING_API_KEY)");
    return;
  }

  const host = new URL(baseUrl).host;
  const response = await fetch("https://www.bing.com/indexnow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
    },
    body: JSON.stringify({
      host,
      key: bingApiKey,
      urlList: urls,
    }),
  });

  logger.info(`Bing response: ${response.status}`);
}
