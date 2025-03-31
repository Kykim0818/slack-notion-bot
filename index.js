const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
app.use(bodyParser.json({ verify: verifySlackRequest }));

// Slack signature 검증
function verifySlackRequest(req, res, buf) {
  const slackSignature = req.headers["x-slack-signature"];
  const requestTimestamp = req.headers["x-slack-request-timestamp"];

  const hmac = crypto.createHmac("sha256", process.env.SLACK_SIGNING_SECRET);
  const baseString = `v0:${requestTimestamp}:${buf.toString()}`;
  hmac.update(baseString);

  const computedSignature = `v0=${hmac.digest("hex")}`;

  if (slackSignature !== computedSignature) {
    throw new Error("Slack verification failed");
  }
}

// Slack 이벤트 수신
app.post("/slack/events", (req, res) => {
  const { type, event } = req.body;

  // URL 검증 요청에 대한 응답
  if (type === "url_verification") {
    return res.send({ challenge: req.body.challenge });
  }

  // 메시지 수신 로그
  if (event && event.type === "message" && !event.bot_id) {
    console.log("📥 수신된 메시지:", event.text);
    console.log("👤 보낸 사람:", event.user);
    console.log("📸 파일 첨부:", event.files);
  }

  return res.status(200).send("OK");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 서버 실행 중! http://localhost:${PORT}`);
});
