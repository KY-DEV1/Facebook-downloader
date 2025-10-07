export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  res.json({
    name: 'Facebook Video Downloader',
    version: '1.0.0',
    status: 'active',
    endpoints: {
      download: '/api/download',
      info: '/api/info'
    },
    usage: {
      method: 'POST',
      body: { url: 'facebook_video_url' }
    }
  });
}
