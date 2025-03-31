const express = require("express");
const bodyParser = require("body-parser");
const crypto = require("crypto");
require("dotenv").config();

const app = express();
app.use(bodyParser.json({ verify: verifySlackRequest })); // ✅ JSON 요청 (예: 이벤트 API 대응용)
app.use(bodyParser.urlencoded({ extended: true })); // ✅ 폼 요청 (슬래시 커맨드 대응용)

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
  const { type, event, challenge } = req.body;

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

//
app.post("/register", async (req, res) => {
  console.log("🔥 req.body:", req.body);
  const text = req.body.text || "";
  if (!text.trim()) {
    return res.send("❗ 텍스트 입력이 비어 있습니다.");
  }

  try {
    // 1. 파싱
    const parts = text.trim().split(" ");
    if (parts.length < 3) {
      return res.send(
        "❗ 올바른 형식: `/문제등록 차수 난이도 링크 [문제명(선택)]`"
      );
    }

    const [차수, 난이도, 링크, ...문제명Arr] = parts;
    const 문제명 = 문제명Arr.length > 0 ? 문제명Arr.join(" ") : "";

    if (!링크.startsWith("http")) {
      return res.send("❗ 문제 링크 형식이 잘못되었습니다.");
    }

    // 2. 날짜 포맷
    const now = new Date();
    const week = ["일", "월", "화", "수", "목", "금", "토"];
    const formattedDate = now
      .toLocaleDateString("ko-KR")
      .replace(/\./g, "/")
      .replace(/ /g, "")
      .replace(/\/$/, "");
    const dayName = week[now.getDay()];
    const 날짜 = `${formattedDate} (${dayName}) ${차수}`;

    // 3. 중복 체크
    const existing = await notion.databases.query({
      database_id: databaseId,
      filter: {
        property: "링크",
        url: { equals: 링크 },
      },
    });

    if (existing.results.length > 0) {
      return res.send("🚫 이미 등록된 문제입니다.");
    }

    // 4. Notion에 등록
    await notion.pages.create({
      parent: { database_id: databaseId },
      properties: {
        날짜: { title: [{ text: { content: 날짜 } }] },
        문제: { rich_text: [{ text: { content: 문제명 } }] },
        난이도: { select: { name: 난이도 } },
        링크: { url: 링크 },
      },
    });

    res.send(`✅ 문제 등록 완료: ${문제명 || "(문제명 없음)"}`);
  } catch (err) {
    console.error(err);
    res.send("🚨 문제 등록 중 오류가 발생했습니다.");
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 서버 on (포트: ${PORT})`));
