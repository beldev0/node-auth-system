const express = require('express')
const { getClientIp } = require("get-client-ip");

const app = express();

// Middleware — auto-populates req.clientIp and req.clientIps
app.use(getClientIp);

app.get("/me", (req, res) => {
  res.json({ ip: req.clientIp, ips: req.clientIps });
});

// Or standalone — call directly in a specific route
app.get("/ip", (req, res) => {
  const ip = getClientIp(req);
  res.json({ ip });
});

app.listen(3000);