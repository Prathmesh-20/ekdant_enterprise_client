module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const body = req.body || {};
  const username = String(body.username || '').trim().toLowerCase();
  const password = String(body.password || '').trim();

  const validUsers = ['admin', 'ekdant', 'dispatch'];
  const validPasswords = ['enterprise', 'ekdant2026'];

  if (validUsers.includes(username) && validPasswords.includes(password)) {
    return res.status(200).json({
      success: true,
      user: {
        username: 'admin',
        name: 'Ekdant Enterprise Admin',
        role: 'Chief Administrator'
      }
    });
  }

  return res.status(401).json({
    success: false,
    error: 'Invalid Staff ID or Password'
  });
};
