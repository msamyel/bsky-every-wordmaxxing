import { app, InvocationContext, Timer } from "@azure/functions";
import axios from "axios";
import { CosmosClient, CosmosClientOptions } from "@azure/cosmos";

function createCosmosClient(): CosmosClient {
  const cosmosDbOptions: CosmosClientOptions = {
    endpoint: process.env["COSMOS_DB_ENDPOINT"],
    key: process.env["COSMOS_DB_KEY"],
    userAgentSuffix: "bsky-wormaxxing-azfunc",
  };
  return new CosmosClient(cosmosDbOptions);
}

async function getLineToRead(cosmosClient: CosmosClient): Promise<number> {
  const dbId = process.env["COSMOS_DB_NAME"];
  const containerId = process.env["COSMOS_DB_CONTAINER"];

  const { resources: items } = await cosmosClient
    .database(dbId)
    .container(containerId)
    .items.query("SELECT * FROM c OFFSET 0 LIMIT 1")
    .fetchAll();

  return items[0].data;
}

async function setLineToRead(
  lineNumber: number,
  cosmosClient: CosmosClient
): Promise<void> {
  const dbId = process.env["COSMOS_DB_NAME"];
  const containerId = process.env["COSMOS_DB_CONTAINER"];

  const { item } = await cosmosClient
    .database(dbId)
    .container(containerId)
    .items.upsert({ id: "line_id", pkey: "pkey", data: lineNumber });

  return;
}

async function loginToBluesky(): Promise<any> {
  const BLUESKY_HANDLE = process.env["BLUESKY_HANDLE"];
  const BLUESKY_APP_PASSWORD = process.env["BLUESKY_APP_PASSWORD"];

  console.log(`Logging in as ${BLUESKY_HANDLE}...`);

  const resp = await axios.post(
    "https://bsky.social/xrpc/com.atproto.server.createSession",
    { identifier: BLUESKY_HANDLE, password: BLUESKY_APP_PASSWORD }
  );
  return resp.data;
}

async function postToBluesky(content: string, session: any): Promise<void> {
  const now = new Date().toISOString();

  const post = {
    $type: "app.bsky.feed.post",
    text: content,
    createdAt: now,
    langs: ["en"],
  };

  const resp = await axios.post(
    "https://bsky.social/xrpc/com.atproto.repo.createRecord",
    { repo: session["did"], collection: "app.bsky.feed.post", record: post },
    { headers: { Authorization: "Bearer " + session["accessJwt"] } }
  );

  return resp.data;
}

async function isContainsProfanity(line: string): Promise<boolean> {
  const headers = {
    "x-rapidapi-host": process.env["PROFANITY_API_HOST"],
    "x-rapidapi-key": process.env["PROFANITY_API_KEY"],
  };

  console.log("checking profanity for line: ", line);

  const response = await axios.get(
    `https://profanity-filter-by-api-ninjas.p.rapidapi.com/v1/profanityfilter?text=${line}`,
    { headers: headers }
  );
  console.log(response.data);

  if (response.data.has_profanity === undefined) {
    throw new Error("Profanity API response is invalid");
  }

  return response.data.has_profanity;
}

async function readLine(lineNumber: number): Promise<string> {
  const fs = require("fs").promises;

  // Specify the file path
  const filePath = "words.txt";

  try {
    // Read the file asynchronously
    const data = await fs.readFile(filePath, "utf8");

    // Split the file content by newline characters
    const lines = data.split("\n");

    if (lineNumber >= lines.length) {
      return undefined;
    }

    return lines[lineNumber];
  } catch (err) {
    console.error(err);
    return "";
  }
}

async function main(): Promise<void> {
  const cosmosClient = createCosmosClient();

  const bskySession = await loginToBluesky();
  if (!bskySession) {
    console.log("Failed to login to Bluesky");
    return;
  }

  let lineNumber: number = await getLineToRead(cosmosClient);
  let lineToPost: string = undefined;

  while (!lineToPost) {
    const line: string = await readLine(lineNumber);
    if (!line) {
      console.log("No more lines to read");
      return;
    }
    if (await isContainsProfanity(line)) {
      lineNumber++;
      continue;
    }

    lineToPost = line;

    lineNumber++;
  }

  await postToBluesky(lineToPost + "maxxing", bskySession);

  await setLineToRead(lineNumber, cosmosClient);

  return;
}

export async function postWordmaxxing(
  myTimer: Timer,
  context: InvocationContext
): Promise<void> {
  await main();
}

app.timer("postWordmaxxing", {
  schedule: "0 17 * * * *",
  handler: postWordmaxxing,
});
