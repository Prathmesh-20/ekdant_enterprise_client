module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'POST') {
    const body = req.body || {};
    return res.status(201).json({
      success: true,
      lead: {
        id: 'LEAD-' + Date.now(),
        createdAt: new Date().toISOString(),
        ...body,
        status: 'New'
      }
    });
  }

  return res.status(200).json([]);
};
