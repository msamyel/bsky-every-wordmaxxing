# Every wordmaxxing

Following the trend of accounts like [F.ck every word](https://bsky.app/profile/fuck.ispost.ing) or [every word is trans](https://x.com/allistrans), this is a repository containing the code for [Every wordmaxxing](https://bsky.app/profile/everywordmaxxing.bsky.social), which gives it a Gen Alpha spin.

While the project's theme is unserious, the code provided should be considered an easy to follow example of how to achieve the following goals:

- set up an Azure Function with a time trigger, in Node.js
- access data in the Azure Cosmos DB and update it
- read a plain text shipped together with the function code, in Node.js
- use `axios` to access 3rd party APIs (in this case, [Profanity filter by Ninja API](https://api-ninjas.com/api/profanityfilter) and [Bluesky Official API](https://docs.bsky.app/docs/tutorials/creating-a-post) are used)

# How to run

First, set up a Microsoft Azure Functions [Node.js v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-reference-node?tabs=javascript%2Cwindows%2Cazure-cli&pivots=nodejs-model-v4) project.

Rename `local.settings.json.sample` to `local.settings.json` and fill the appropriate values, such as your Bluesky credentials or Azure Cosmos DB connection strings.

In your Cosmos DB Container, include only a single line with the following data: `{id: "line_id", pkey: "pkey", data: 0}`. `pkey` is used as a partition key (not important in this example), and `data` will point to the index of the line in `words.txt` which should be processed next.

Finally, place a `words.txt` file in the project's root directory. This file should contain one word per line.

Now you can run your function either locally, or you can upload it to Azure and have it run at a specified time. In this example, the `schedule` argument value `"0 17 * * * *",` means that it will run on the 17th minute of each hour of each day.
