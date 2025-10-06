class FacebookVideoDownloader {
    constructor() {
        this.apiBaseUrl = '/api/download';
        this.isProcessing = false;
        this.initializeEventListeners();
        this.initializeServiceWorker();
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
    }

    initializeServiceWorker() {
        // Optional: Add service worker for offline functionality
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js')
                .then(() => console.log('Service Worker registered'))
                .catch(err => console.log('Service Worker registration failed'));
        }
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
            const videoData = await this.fetchVideoData(url);
            this.displayResult(videoData);
            this.trackEvent('download_success', { url });
        } catch (error) {
            this.showError(error.message);
            this.trackEvent('download_error', { url, error: error.message });
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
            this.showError('❌ URL Facebook tidak valid. Format yang didukung:\n• https://facebook.com/.../videos/...\n• https://fb.watch/...\n• https://m.facebook.com/.../videos/...');
            return false;
        }

        return true;
    }

    isValidFacebookUrl(url) {
        const facebookRegex = /(?:https?:\/\/)?(?:www\.|m\.)?(?:facebook\.com|fb\.watch)\/(?:video\.php\?v=\d+|[\w\.]+\/videos?(?:\/[\w\-]+\/?)?\/?\d+)/;
        return facebookRegex.test(url);
    }

    async fetchVideoData(url) {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

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

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.error);
            }

            return data.data;
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('⏰ Timeout: Proses mengambil video terlalu lama. Coba lagi.');
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

        // Set data video
        thumbnail.src = videoData.thumbnail;
        thumbnail.alt = videoData.title;
        thumbnail.onerror = () => {
            thumbnail.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAwIiBoZWlnaHQ9IjMwMCIgdmlld0JveD0iMCAwIDQwMCAzMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI0MDAiIGhlaWdodD0iMzAwIiBmaWxsPSIjRjBGMEYwIi8+CjxwYXRoIGQ9Ik0xNjAgMTIwSDE0MFYxODBIMTYwVjEyMFpNMTgwIDE0MEgyMDBWMTYwSDE4MFYxNDBaTTIyMCAxMjBIMjQwVjE4MEgyMjBWMTIwWk0yNjAgMTQwSDI4MFYxNjBIMjYwVjE0MFoiIGZpbGw9IiNDOEM4QzgiLz4KPC9zdmc+';
        };
        
        duration.textContent = videoData.duration;
        views.textContent = videoData.metadata?.views + ' views' || '0 views';
        videoTitle.textContent = videoData.title;
        uploadDate.textContent = videoData.metadata?.uploadDate || 'Today';
        source.textContent = videoData.metadata?.source || 'Facebook';

        // Buat opsi kualitas
        qualityOptions.innerHTML = videoData.qualities.map((quality, index) => `
            <a href="${quality.url}" 
               class="quality-btn" 
               target="_blank" 
               rel="noopener noreferrer"
               download="${this.sanitizeFilename(videoData.title)} - ${quality.quality}.${this.getFileExtension(quality.type)}"
               onclick="this.trackEvent('quality_selected', { quality: '${quality.quality}', url: '${videoData.qualities[0].url}' })">
                <div class="quality-info">
                    <span class="quality-badge">${quality.quality}</span>
                    <span>${quality.size}</span>
                    <span class="file-type">${this.getFileType(quality.type)}</span>
                </div>
                <span>⬇️ Download</span>
            </a>
        `).join('');

        // Tampilkan hasil dengan animasi
        resultSection.style.display = 'block';
        setTimeout(() => {
            resultSection.scrollIntoView({ 
                behavior: 'smooth',
                block: 'center'
            });
        }, 100);
    }

    sanitizeFilename(filename) {
        return filename.replace(/[^a-z0-9]/gi, '_').toLowerCase();
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
            btnText.textContent = '🎬 Download Video';
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

    trackEvent(eventName, properties = {}) {
        // Simple analytics tracking
        if (typeof gtag !== 'undefined') {
            gtag('event', eventName, properties);
        }
        console.log(`Event: ${eventName}`, properties);
    }
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Inisialisasi aplikasi ketika DOM siap
document.addEventListener('DOMContentLoaded', () => {
    const app = new FacebookVideoDownloader();
    
    // Tambahkan global function untuk tracking
    window.trackEvent = (eventName, properties) => {
        app.trackEvent(eventName, properties);
    };
    
    console.log('Facebook Video Downloader initialized!');
});

// Handle page visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        console.log('Page is visible');
    }
});
