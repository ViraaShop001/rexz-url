class RexzUploader {
    constructor() {
        this.initializeElements();
        this.bindEvents();
        this.currentTheme = localStorage.getItem('theme') || 'dark';
        this.applyTheme(this.currentTheme);
    }

    initializeElements() {
        // Core elements
        this.uploadZone = document.getElementById('uploadZone');
        this.fileInput = document.getElementById('fileInput');
        this.progressContainer = document.getElementById('progressContainer');
        this.progressFill = document.getElementById('progressFill');
        this.progressPercent = document.getElementById('progressPercent');
        this.progressText = document.getElementById('progressText');
        this.progressStats = document.getElementById('progressStats');
        this.previewContainer = document.getElementById('previewContainer');
        this.resultContainer = document.getElementById('resultContainer');
        this.fileUrl = document.getElementById('fileUrl');
        this.fileDetails = document.getElementById('fileDetails');
        this.copyBtn = document.getElementById('copyBtn');
        this.toast = document.getElementById('toast');
        this.themeToggle = document.getElementById('themeToggle');
    }

    bindEvents() {
        // File input events
        this.uploadZone.addEventListener('click', () => this.fileInput.click());
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        
        // Drag and drop events[citation:8]
        this.uploadZone.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadZone.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadZone.addEventListener('drop', (e) => this.handleDrop(e));
        
        // Copy URL button
        this.copyBtn.addEventListener('click', () => this.copyUrl());
        
        // Theme toggle
        this.themeToggle.addEventListener('click', () => this.toggleTheme());
    }

    handleDragOver(e) {
        e.preventDefault();
        this.uploadZone.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadZone.classList.remove('dragover');
    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadZone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFiles(files);
        }
    }

    handleFileSelect(e) {
        const files = e.target.files;
        if (files.length > 0) {
            this.processFiles(files);
        }
    }

    processFiles(files) {
        this.previewContainer.innerHTML = '';
        
        Array.from(files).forEach(file => {
            if (!this.validateFile(file)) return;
            
            this.createPreview(file);
        });
        
        // Upload all valid files
        this.uploadFiles(files);
    }

    validateFile(file) {
        const maxSize = 100 * 1024 * 1024; // 100MB
        const allowedTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
            'video/mp4', 'video/webm', 'video/quicktime',
            'audio/mpeg', 'audio/wav', 'audio/ogg',
            'application/pdf',
            'application/zip', 'application/x-rar-compressed'
        ];

        if (file.size > maxSize) {
            this.showToast('File terlalu besar! Maksimal 100MB', 'error');
            return false;
        }

        if (!allowedTypes.includes(file.type)) {
            this.showToast('Tipe file tidak didukung', 'error');
            return false;
        }

        return true;
    }

    createPreview(file) {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        
        const objectURL = URL.createObjectURL(file);
        
        let previewContent = '';
        if (file.type.startsWith('image/')) {
            previewContent = `<img src="${objectURL}" alt="Preview" class="preview-thumbnail">`;
        } else if (file.type.startsWith('video/')) {
            previewContent = `<video src="${objectURL}" controls class="preview-video" height="60"></video>`;
        } else if (file.type.startsWith('audio/')) {
            previewContent = `<audio src="${objectURL}" controls class="preview-audio"></audio>`;
        } else if (file.type === 'application/pdf') {
            previewContent = '<div class="preview-thumbnail" style="background: #ff4757; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">PDF</div>';
        } else if (file.type === 'application/zip' || file.type === 'application/x-rar-compressed') {
            previewContent = '<div class="preview-thumbnail" style="background: #ffa502; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">ZIP</div>';
        } else {
            previewContent = '<div class="preview-thumbnail" style="background: #57606f; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.5rem;">FILE</div>';
        }
        
        previewItem.innerHTML = `
            ${previewContent}
            <div class="preview-details">
                <div class="preview-name">${this.sanitizeFilename(file.name)}</div>
                <div class="preview-size">${this.formatFileSize(file.size)}</div>
            </div>
        `;
        
        this.previewContainer.appendChild(previewItem);
    }

    async uploadFiles(files) {
        this.showProgress(true);
        this.resultContainer.style.display = 'none';
        
        for (let file of files) {
            if (!this.validateFile(file)) continue;
            
            await this.uploadSingleFile(file);
        }
    }

    async uploadSingleFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        try {
            const xhr = new XMLHttpRequest();
            
            // Progress tracking[citation:10]
            xhr.upload.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percentComplete = (event.loaded / event.total) * 100;
                    this.updateProgress(percentComplete, event.loaded, event.total);
                }
            };

            const promise = new Promise((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status === 200) {
                        const response = JSON.parse(xhr.responseText);
                        resolve(response);
                    } else {
                        reject(new Error('Upload failed'));
                    }
                };
                
                xhr.onerror = () => reject(new Error('Upload error'));
            });

            xhr.open('POST', '/upload');
            xhr.send(formData);

            const result = await promise;
            this.showResult(result);
            this.showToast('File berhasil diupload!', 'success');
            
        } catch (error) {
            console.error('Upload error:', error);
            this.showToast('Gagal mengupload file', 'error');
        } finally {
            this.showProgress(false);
        }
    }

    updateProgress(percent, loaded, total) {
        this.progressFill.style.width = percent + '%';
        this.progressPercent.textContent = Math.round(percent) + '%';
        this.progressStats.textContent = `${this.formatFileSize(loaded)} / ${this.formatFileSize(total)}`;
    }

    showProgress(show) {
        this.progressContainer.style.display = show ? 'block' : 'none';
        if (!show) {
            this.updateProgress(0, 0, 0);
        }
    }

    showResult(result) {
        this.fileUrl.value = result.fileUrl;
        this.fileDetails.innerHTML = `
            <p><strong>Nama:</strong> ${result.fileName}</p>
            <p><strong>Tipe:</strong> ${result.fileType}</p>
            <p><strong>Ukuran:</strong> ${this.formatFileSize(result.fileSize)}</p>
            <p><strong>ID:</strong> ${result.fileId}</p>
        `;
        this.resultContainer.style.display = 'block';
    }

    copyUrl() {
        this.fileUrl.select();
        document.execCommand('copy');
        this.showToast('URL berhasil disalin!', 'success');
    }

    showToast(message, type = 'info') {
        this.toast.textContent = message;
        this.toast.className = `toast show ${type}`;
        
        setTimeout(() => {
            this.toast.classList.remove('show');
        }, 3000);
    }

    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.applyTheme(newTheme);
        this.currentTheme = newTheme;
        localStorage.setItem('theme', newTheme);
    }

    applyTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        const themeIcon = this.themeToggle.querySelector('.theme-icon');
        themeIcon.textContent = theme === 'dark' ? '🌙' : '☀️';
    }

    sanitizeFilename(filename) {
        return filename.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    new RexzUploader();
});