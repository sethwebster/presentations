import fs from "fs";
import fetch from "node-fetch";

(async () => {
    const response = await fetch("https://api.fireworks.ai/inference/v1/workflows/accounts/fireworks/models/flux-1-dev-fp8/text_to_image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "image/jpeg",
        "Authorization": "Bearer $API_KEY"
      },
      body: JSON.stringify({
        prompt: "A beautiful sunset over the ocean"
      }),
    });

    // To process the response and get the image:
    const buffer = await response.arrayBuffer();

    fs.writeFile('a.jpg', Buffer.from(buffer), () => console.log('Finished downloading!'));
})().catch(console.error);