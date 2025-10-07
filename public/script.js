class FacebookDownloaderPro {
    constructor() {
        this.apiBaseUrl = '/api/download';
        this.isProcessing = false;
        this.downloadCount = parseInt(localStorage.getItem('downloadCount') || '1234');
        this.initializeApp();
    }

    initializeApp() {
        this.initializeEventListeners();
        this.initializeStats();
        this.initializeServiceWorker();
        this.setupAnalytics();
    }

    initializeEventListeners() {
        const downloadBtn = document.getElementById('download-btn');
        const urlInput = document.getElementById('url');

        downloadBtn.addEventListener('click', () => this.handleDownload());
        urlInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.isProcessing) {
                this.handleDownload();
            }
        });

        // Clear error when user starts typing
        urlInput.addEventListener('input', () => {
            this.hideError();
        });

        // Auto-focus on input
        setTimeout(() => {
            urlInput.focus();
        }, 500);
    }

    initializeStats() {
        // Update stats with random variations
        const stats = {
            downloads: this.downloadCount + Math.floor(Math.random() * 100),
            success: 97 + Math.floor(Math.random() * 3),
            speed: (1.8 + Math.random() * 1.5).toFixed(1)
        };

        document.getElementById('stat-downloads').textContent = 
            stats.downloads.toLocaleString();
        document.getElementById('stat-success').textContent = 
            stats.success + '%';
        document.getElementById('stat-speed').textContent = 
            stats.speed + 's';
    }

    initializeServiceWorker() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(() => console.log('SW registered'))
                .catch(err => console.log('SW registration failed'));
        }
    }

    setupAnalytics() {
        // Simple analytics
        window.trackEvent = (event, data) => {
            console.log('Event:', event, data);
        };
    }

    async handleDownload() {
        if (this.isProcessing) return;

        const url = document.getElementById('url').value.trim();
        const downloadBtn = document.getElementById('download-btn');
        const loader = document.getElementById('loader');
        const btnText = document.getElementById('btn-text');

        if (!this.validateInput(url)) {
            return;
        }

        this.isProcessing = true;
        this.setLoadingState(true, downloadBtn, loader, btnText);
        this.hideError();
        this.hideResult();

        try {
            trackEvent('download_started', { url });
            const videoData = await this.fetchVideoData(url);
            
            if (videoData.success) {
                this.displayResult(videoData.data);
                this.incrementDownloadCount();
                trackEvent('download_success', { url });
            } else {
                throw new Error(videoData.error);
            }
        } catch (error) {
            this.showError(error.message);
            trackEvent('download_error', { url, error: error.message });
        } finally {
            this.isProcessing = false;
            this.setLoadingState(false, downloadBtn, loader, btnText);
        }
    }

    validateInput(url) {
        if (!url) {
            this.showError('❌ Silakan masukkan URL video Facebook');
            return false;
        }

        if (!this.isValidFacebookUrl(url)) {
            this.showError('❌ URL Facebook tidak valid. Pastikan URL dari video Facebook.\n\nFormat yang didukung:\n• https://facebook.com/.../videos/...\n• https://fb.watch/...\n• https://m.facebook.com/.../videos/...');
            return false;
        }

        return true;
    }

    isValidFacebookUrl(url) {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname;
    
    // Check if it's a Facebook domain
    if (!hostname.includes('facebook.com') && !hostname.includes('fb.watch')) {
      return false;
    }

    // Check path patterns for video content
    const path = urlObj.pathname + urlObj.search;
    const videoPatterns = [
      /\/videos?\//,
      /\/video\.php/,
      /\/watch\/?/,
      /\/share\/v\//,
      /\/reel\//,
      /\/story\.php/,
      /\/posts\//,
      /\/photo\.php/
    ];

    return videoPatterns.some(pattern => pattern.test(path));
  } catch (error) {
    return false;
  }
    }

    async fetchVideoData(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000);

        try {
            const response = await fetch(this.apiBaseUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ url }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('⏰ Waktu permintaan habis. Coba lagi dengan URL yang berbeda.');
            }
            throw error;
        }
    }

    displayResult(videoData) {
        const resultSection = document.getElementById('result');
        const thumbnail = document.getElementById('thumbnail');
        const duration = document.getElementById('duration');
        const views = document.getElementById('views');
        const videoTitle = document.getElementById('video-title');
        const uploadDate = document.getElementById('upload-date');
        const source = document.getElementById('source');
        const qualityOptions = document.getElementById('quality-options');

        // Set video data
        thumbnail.src = videoData.thumbnail;
        thumbnail.alt = videoData.title;
        duration.textContent = videoData.duration || '--:--';
        views.textContent = (videoData.metadata?.views || '0') + ' views';
        videoTitle.textContent = videoData.title;
        uploadDate.textContent = videoData.metadata?.uploadDate || 'Hari ini';
        source.textContent = videoData.metadata?.source || 'Facebook';

        // Create quality options
        qualityOptions.innerHTML = videoData.qualities.map((quality, index) => {
            const filename = this.sanitizeFilename(`${videoData.title} - ${quality.quality}`);
            const fileExt = this.getFileExtension(quality.type);
            
            return `
                <a href="${quality.url}" 
                   class="quality-btn" 
                   target="_blank" 
                   rel="noopener noreferrer"
                   download="${filename}.${fileExt}"
                   onclick="trackEvent('quality_selected', { quality: '${quality.quality}', url: '${quality.url}' })">
                    <div class="quality-info">
                        <span class="quality-badge">${quality.quality}</span>
                        <span>${quality.size}</span>
                        <span class="file-type">${this.getFileType(quality.type)}</span>
                    </div>
                    <span>⬇️ Download</span>
                </a>
            `;
        }).join('');

        // Show result with animation
        resultSection.style.display = 'block';
        setTimeout(() => {
            resultSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'center'
            });
        }, 100);
    }

    sanitizeFilename(filename) {
        return filename
            .replace(/[^a-z0-9\s]/gi, '_')
            .replace(/\s+/g, '_')
            .toLowerCase()
            .substring(0, 100);
    }

    getFileExtension(mimeType) {
        const extensions = {
            'video/mp4': 'mp4',
            'video/webm': 'webm',
            'audio/mp3': 'mp3',
            'audio/mpeg': 'mp3'
        };
        return extensions[mimeType] || 'mp4';
    }

    getFileType(mimeType) {
        return mimeType.startsWith('video/') ? 'Video' : 'Audio';
    }

    setLoadingState(isLoading, button, loader, btnText) {
        if (isLoading) {
            loader.style.display = 'block';
            btnText.textContent = '🔄 Mencari Video...';
            button.disabled = true;
        } else {
            loader.style.display = 'none';
            btnText.textContent = '🎬 Download Video Sekarang';
            button.disabled = false;
        }
    }

    showError(message) {
        const errorElement = document.getElementById('error');
        const errorText = document.getElementById('error-text');
        
        errorText.textContent = message;
        errorElement.style.display = 'flex';
        
        setTimeout(() => {
            errorElement.scrollIntoView({ 
                behavior: 'smooth',
                block: 'center'
            });
        }, 100);
    }

    hideError() {
        document.getElementById('error').style.display = 'none';
    }

    hideResult() {
        document.getElementById('result').style.display = 'none';
    }

    incrementDownloadCount() {
        this.downloadCount++;
        localStorage.setItem('downloadCount', this.downloadCount.toString());
        this.initializeStats();
    }
}

// Utility functions
function formatFileSize(bytes) {
    if (!bytes) return 'Unknown';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Global track event function
function trackEvent(event, data) {
    if (typeof gtag !== 'undefined') {
        gtag('event', event, data);
    }
    console.log(`[Analytics] ${event}:`, data);
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.downloader = new FacebookDownloaderPro();
    console.log('🚀 FB Downloader Pro initialized!');
    
    // Add some interactive features
    const urlInput = document.getElementById('url');
    urlInput.addEventListener('focus', () => {
        trackEvent('input_focused');
    });
});

// Handle page visibility for better UX
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        trackEvent('page_visible');
    }
});

