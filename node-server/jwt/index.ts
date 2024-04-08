import express from "express";
import jwt from "jsonwebtoken";

const secretKey = "your-secret-key";

const app = express();
app.use(express.json());

// 登录路由，生成JWT
/**
 * curl -X POST http://localhost:3000/login \
    -H "Content-Type: application/json" \
    -d '{"username":"user", "password":"password"}'
 */
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  // 在实际应用中，这里会验证用户名和密码
  if (username === "user" && password === "password") {
    const payload = { username };
    const token = jwt.sign(payload, secretKey, { expiresIn: "1h" });
    res.json({ token });
  } else {
    res.status(401).json({ error: "Authentication failed" });
  }
});

// 受保护的路由，需要JWT验证
/**
 * curl http://localhost:3000/protected \
    -H "Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6InVzZXIiLCJpYXQiOjE3MTI1NTU3MDQsImV4cCI6MTcxMjU1OTMwNH0.Y2H3NXlXOCVtTXlcyqop38qlgCeb88GeC4vB9slVvFs"
 */
app.get("/protected", authenticateToken, (req, res) => {
  // @ts-ignore
  res.json({ message: "This is a protected route", user: req.user });
});

function authenticateToken(req, res, next) {
  const token = req.header("Authorization");
  if (!token) {
    return res.status(401).send("Access denied");
  }

  try {
    const decoded = jwt.verify(token, secretKey);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(403).send("Invalid token");
  }
}

app.listen(3000, () => {
  console.log("Server is running on port 3000", "http://localhost:3000");
});
