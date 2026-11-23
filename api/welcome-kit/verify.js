
const { validateToken } = require("./_token");

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed"
    });
  }

  const { email } =
    validateToken(req.query.token) || {};

  if (!email) {
    return res.status(401).json({
      error: "Invalid or expired welcome link"
    });
  }

  return res.status(200).json({
    email
  });
};
