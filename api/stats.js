module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  return res.status(200).json({
    totalLeads: 8,
    newLeads: 2,
    emergencies: 1,
    scheduled: 3,
    avgRating: '4.9',
    totalReviews: 248
  });
};
