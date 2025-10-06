import axios from 'axios';
import * as cheerio from 'cheerio';

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle preflight request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Method not allowed. Use POST.'
    });
  }

  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        error: 'URL video Facebook diperlukan'
      });
    }

    // Validasi URL Facebook
    if (!isValidFacebookUrl(url)) {
      return res.status(400).json({
        success: false,
        error: 'URL Facebook tidak valid. Format yang didukung: facebook.com/.../videos/... atau fb.watch/...'
      });
    }

    console.log('Processing URL:', url);

    // Ekstrak data video
    const videoData = await extractVideoData(url);

    return res.status(200).json({
      success: true,
      data: videoData
    });

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Terjadi kesalahan server'
    });
  }
}

function isValidFacebookUrl(url) {
  const facebookRegex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:facebook\.com|fb\.watch)\/(?:video\.php\?v=\d+|[\w\.]+\/videos?(?:\/[\w\-]+\/?)?\/?\d+)/;
  return facebookRegex.test(url);
}

async function extractVideoData(url) {
  try {
    // Simulasi proses pengambilan data
    // NOTE: Untuk production, Anda perlu menggunakan service seperti:
    // - yt-dlp executable
    // - Facebook Graph API (dengan token)
    // - Third-party APIs
    
    // Simulasi delay network
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate unique ID based on URL for consistent demo data
    const urlHash = Buffer.from(url).toString('base64').slice(0, 8);
    
    // Data demo yang lebih realistis
    const demoData = {
      title: `Video Facebook - ${urlHash}`,
      thumbnail: `https://picsum.photos/400/300?random=${urlHash}`,
      duration: `${Math.floor(Math.random() * 5) + 1}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}`,
      qualities: [
        {
          quality: 'HD 720p',
          url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
          size: '1.2 MB',
          type: 'video/mp4'
        },
        {
          quality: 'SD 480p',
          url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_640x360_1mb.mp4', 
          size: '0.8 MB',
          type: 'video/mp4'
        },
        {
          quality: 'Audio Only',
          url: 'https://sample-videos.com/zip/10/mp4/SampleVideo_1280x720_1mb.mp4',
          size: '0.3 MB',
          type: 'audio/mp3'
        }
      ],
      metadata: {
        views: (Math.floor(Math.random() * 10000) + 1000).toLocaleString(),
        uploadDate: new Date().toLocaleDateString('id-ID'),
        source: 'Facebook'
      }
    };

    return demoData;

  } catch (error) {
    console.error('Extraction error:', error);
    throw new Error('Gagal mengambil data video dari Facebook');
  }
      }
