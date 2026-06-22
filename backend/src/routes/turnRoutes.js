const express = require("express");
const router = express.Router();

router.get("/turn-credentials", async (req, res) => {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;

  if (!sid || !token) {
    return res.json({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });
  }

  try {
    const twilio = require("twilio");
    const client = twilio(sid, token);
    const t = await client.tokens.create();
    res.json({ iceServers: t.iceServers });
  } catch (err) {
    res.json({
      iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
      ],
    });
  }
});

module.exports = router;
