const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
app.use(bodyParser.json({ verify: verifySlackRequest }));

function verifySlackRequest(req, res, buf) {
  const signature = req.headers["x-slack-signature"];
  const timestamp = req.headers["x-slack-request-timestamp"];
  const hmac = crypto.createHmac("sha256", process.env.SLACK_SIGNING_SECRET);
  const [version, hash] = signature.split("=");
  hmac.update(`v0:${timestamp}:${buf.toString()}`);
  const calculated = hmac.digest("hex");
  if (hash !== calculated) {
    throw new Error("Invalid signature");
  }
}

app.post("/slack/events", (req, res) => {
  const { type, event } = req.body;

  if (type === "url_verification") {
    return res.status(200).send(challenge);
  }

  if (event && event.type === "message" && !event.bot_id) {
    console.log("✅ 메시지 수신:", event.text);
    console.log("📸 첨부파일:", event.files);
    console.log("👤 보낸 사람:", event.user);
  }

  res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 서버 on (포트: ${PORT})`));
