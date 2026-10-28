const fs = require('fs');
const path = require('path');

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const filePath = path.join(process.cwd(), 'data', 'reviews.json');
    if (fs.existsSync(filePath)) {
      const reviews = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      return res.status(200).json(reviews);
    }
  } catch (e) {}

  return res.status(200).json([]);
};
