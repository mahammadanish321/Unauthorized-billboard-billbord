/**
 * Billboard Detection AI - Main Application Script
 * Enhanced frontend with optimized performance and modern JavaScript
 */

class BillboardAI {
    constructor() {
        this.currentUser = null;
        this.analysisHistory = [];
        this.settings = {
            theme: 'light',
            notifications: true,
            maxFileSize: 10,
            autoAnalyze: false
        };
        
        // DOM elements cache
        this.elements = {};
        
        // Application state
        this.state = {
            currentSection: 'analyze',
            isAnalyzing: false,
            uploadedImages: new Map()
        };
        
        this.init();
    }

    /**
     * Initialize the application
     */
    async init() {
        await this.showLoadingScreen();
        this.loadUserData();
        this.loadSettings();
        this.loadAnalysisHistory();
        this.cacheElements();
        this.setupEventListeners();
        this.initializeFeatherIcons();
        this.updateUI();
        await this.hideLoadingScreen();
    }

    /**
     * Show loading screen with animation
     */
    async showLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.style.display = 'flex';
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    /**
     * Hide loading screen with animation
     */
    async hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
            setTimeout(() => {
                loadingScreen.style.display = 'none';
            }, 500);
        }
    }

    /**
     * Cache frequently used DOM elements
     */
    cacheElements() {
        const elementIds = [
            'nav-toggle', 'nav-menu', 'upload-zone', 'file-input',
            'image-gallery', 'total-analyzed', 'authorized-count',
            'unauthorized-count', 'accuracy-rate', 'history-content',
            'history-search', 'export-csv', 'preferences-form',
            'theme-select', 'notifications', 'max-file-size',
            'file-size-value', 'auto-analyze', 'profile-content',
            'profile-logged-in', 'profile-logged-out', 'profile-username',
            'profile-email', 'profile-role', 'logout-btn', 'toast-container'
        ];

        elementIds.forEach(id => {
            this.elements[id] = document.getElementById(id);
        });

        // Cache nav links and sections
        this.elements.navLinks = document.querySelectorAll('.nav-link');
        this.elements.sections = document.querySelectorAll('.section');
    }

    /**
     * Setup all event listeners
     */
    setupEventListeners() {
        this.setupNavigationEvents();
        this.setupUploadEvents();
        this.setupFormEvents();
        this.setupKeyboardEvents();
        this.setupResizeEvents();
    }

    /**
     * Setup navigation events
     */
    setupNavigationEvents() {
        // Mobile menu toggle
        this.elements['nav-toggle']?.addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // Navigation links
        this.elements.navLinks?.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const section = link.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Close mobile menu when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.main-nav') && this.elements['nav-menu']?.classList.contains('active')) {
                this.closeMobileMenu();
            }
        });
    }

    /**
     * Setup upload and file handling events
     */
    setupUploadEvents() {
        const uploadZone = this.elements['upload-zone'];
        const fileInput = this.elements['file-input'];

        if (uploadZone && fileInput) {
            // Click to select files
            uploadZone.addEventListener('click', () => fileInput.click());

            // Drag and drop events
            uploadZone.addEventListener('dragover', this.handleDragOver.bind(this));
            uploadZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
            uploadZone.addEventListener('drop', this.handleDrop.bind(this));

            // File input change
            fileInput.addEventListener('change', this.handleFileSelect.bind(this));

            // Keyboard accessibility
            uploadZone.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInput.click();
                }
            });
        }

        // Export CSV button
        this.elements['export-csv']?.addEventListener('click', this.exportToCSV.bind(this));
    }

    /**
     * Setup form events
     */
    setupFormEvents() {
        // Settings form
        const preferencesForm = this.elements['preferences-form'];
        if (preferencesForm) {
            preferencesForm.addEventListener('submit', this.handleSettingsSubmit.bind(this));
        }

        // File size range input
        const fileSizeInput = this.elements['max-file-size'];
        const fileSizeValue = this.elements['file-size-value'];
        if (fileSizeInput && fileSizeValue) {
            fileSizeInput.addEventListener('input', (e) => {
                fileSizeValue.textContent = `${e.target.value} MB`;
            });
        }

        // History search
        const historySearch = this.elements['history-search'];
        if (historySearch) {
            let searchTimeout;
            historySearch.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.filterHistory(e.target.value);
                }, 300);
            });
        }

        // Logout button
        this.elements['logout-btn']?.addEventListener('click', this.handleLogout.bind(this));
    }

    /**
     * Setup keyboard events for accessibility
     */
    setupKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            // Escape key closes mobile menu
            if (e.key === 'Escape' && this.elements['nav-menu']?.classList.contains('active')) {
                this.closeMobileMenu();
            }

            // Quick navigation shortcuts
            if (e.ctrlKey || e.metaKey) {
                switch (e.key) {
                    case '1':
                        e.preventDefault();
                        this.showSection('analyze');
                        break;
                    case '2':
                        e.preventDefault();
                        this.showSection('analytics');
                        break;
                    case '3':
                        e.preventDefault();
                        this.showSection('settings');
                        break;
                    case '4':
                        e.preventDefault();
                        this.showSection('profile');
                        break;
                }
            }
        });
    }

    /**
     * Setup window resize events
     */
    setupResizeEvents() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                // Close mobile menu on resize to desktop
                if (window.innerWidth > 768) {
                    this.closeMobileMenu();
                }
            }, 250);
        });
    }

    /**
     * Initialize Feather icons
     */
    initializeFeatherIcons() {
        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    /**
     * Load user data from localStorage
     */
    loadUserData() {
        try {
            const userData = localStorage.getItem('currentUser');
            if (userData) {
                this.currentUser = JSON.parse(userData);
            }
        } catch (error) {
            console.warn('Failed to load user data:', error);
            localStorage.removeItem('currentUser');
        }
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        try {
            const settings = localStorage.getItem('billboardAI_settings');
            if (settings) {
                this.settings = { ...this.settings, ...JSON.parse(settings) };
            }
        } catch (error) {
            console.warn('Failed to load settings:', error);
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('billboardAI_settings', JSON.stringify(this.settings));
            this.showToast('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Failed to save settings:', error);
            this.showToast('Failed to save settings', 'error');
        }
    }

    /**
     * Load analysis history from localStorage
     */
    loadAnalysisHistory() {
        try {
            const history = localStorage.getItem('billboardAI_history');
            if (history) {
                this.analysisHistory = JSON.parse(history);
            }
        } catch (error) {
            console.warn('Failed to load analysis history:', error);
        }
    }

    /**
     * Save analysis history to localStorage
     */
    saveAnalysisHistory() {
        try {
            localStorage.setItem('billboardAI_history', JSON.stringify(this.analysisHistory));
        } catch (error) {
            console.error('Failed to save analysis history:', error);
        }
    }

    /**
     * Update UI based on current state
     */
    updateUI() {
        this.updateProfileSection();
        this.updateStats();
        this.updateHistory();
        this.updateSettingsForm();
    }

    /**
     * Show a specific section
     */
    showSection(sectionId) {
        if (!sectionId) return;

        this.state.currentSection = sectionId;

        // Update sections visibility
        this.elements.sections?.forEach(section => {
            section.classList.remove('active');
            if (section.id === sectionId) {
                section.classList.add('active');
            }
        });

        // Update navigation links
        this.elements.navLinks?.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('data-section') === sectionId) {
                link.classList.add('active');
                if (link) link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });

        // Close mobile menu
        this.closeMobileMenu();

        // Trigger section-specific updates
        this.onSectionChange(sectionId);
    }

    /**
     * Handle section change
     */
    onSectionChange(sectionId) {
        switch (sectionId) {
            case 'analytics':
                this.updateStats();
                this.updateHistory();
                break;
            case 'profile':
                this.updateProfileSection();
                break;
            case 'settings':
                this.updateSettingsForm();
                break;
        }
    }

    /**
     * Toggle mobile menu
     */
    toggleMobileMenu() {
        const navToggle = this.elements['nav-toggle'];
        const navMenu = this.elements['nav-menu'];
        
        if (navToggle && navMenu) {
            const isOpen = navMenu.classList.contains('active');
            
            if (isOpen) {
                this.closeMobileMenu();
            } else {
                this.openMobileMenu();
            }
        }
    }

    /**
     * Open mobile menu
     */
    openMobileMenu() {
        const navToggle = this.elements['nav-toggle'];
        const navMenu = this.elements['nav-menu'];
        
        navMenu?.classList.add('active');
        if (navToggle) navToggle.setAttribute('aria-expanded', 'true');
    }

    /**
     * Close mobile menu
     */
    closeMobileMenu() {
        const navToggle = this.elements['nav-toggle'];
        const navMenu = this.elements['nav-menu'];
        
        navMenu?.classList.remove('active');
        if (navToggle) navToggle.setAttribute('aria-expanded', 'false');
    }

    /**
     * Handle drag over event
     */
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        e.target.closest('.upload-zone')?.classList.add('drag-over');
    }

    /**
     * Handle drag leave event
     */
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!e.target.closest('.upload-zone')?.contains(e.relatedTarget)) {
            e.target.closest('.upload-zone')?.classList.remove('drag-over');
        }
    }

    /**
     * Handle drop event
     */
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        e.target.closest('.upload-zone')?.classList.remove('drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        this.processFiles(files);
    }

    /**
     * Handle file select event
     */
    handleFileSelect(e) {
        const files = Array.from(e.target.files);
        this.processFiles(files);
        e.target.value = ''; // Clear input for future uploads
    }

    /**
     * Process selected files
     */
    async processFiles(files) {
        if (!this.currentUser) {
            this.showToast('Please sign in to upload images', 'warning');
            return;
        }

        if (files.length === 0) return;

        const validFiles = this.validateFiles(files);
        if (validFiles.length === 0) return;

        this.showToast(`Processing ${validFiles.length} image(s)...`, 'info');

        for (const file of validFiles) {
            await this.addImageToGallery(file);
        }

        // Auto-analyze if enabled
        if (this.settings.autoAnalyze) {
            this.analyzeAllPendingImages();
        }
    }

    /**
     * Validate uploaded files
     */
    validateFiles(files) {
        const validFiles = [];
        const maxSize = this.settings.maxFileSize * 1024 * 1024; // Convert MB to bytes
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

        files.forEach(file => {
            if (!allowedTypes.includes(file.type)) {
                this.showToast(`${file.name}: Unsupported file type`, 'error');
                return;
            }

            if (file.size > maxSize) {
                this.showToast(`${file.name}: File too large (max ${this.settings.maxFileSize}MB)`, 'error');
                return;
            }

            validFiles.push(file);
        });

        return validFiles;
    }

    /**
     * Add image to gallery
     */
    async addImageToGallery(file) {
        const imageId = this.generateImageId();
        const imageUrl = await this.fileToDataURL(file);

        const imageData = {
            id: imageId,
            name: file.name,
            url: imageUrl,
            status: 'pending',
            uploadTime: new Date().toISOString(),
            size: file.size
        };

        this.state.uploadedImages.set(imageId, imageData);
        this.renderImageItem(imageData);
    }

    /**
     * Convert file to data URL
     */
    fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Generate unique image ID
     */
    generateImageId() {
        return `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Render image item in gallery
     */
    renderImageItem(imageData) {
        const gallery = this.elements['image-gallery'];
        if (!gallery) return;

        const imageElement = document.createElement('div');
        imageElement.className = 'image-item';
        imageElement.id = imageData.id;
        
        imageElement.innerHTML = `
            <img src="${imageData.url}" alt="${imageData.name}" class="image-preview" loading="lazy">
            <div class="image-info">
                <h3 class="image-name">${this.truncateText(imageData.name, 30)}</h3>
                <div class="image-actions">
                    <button type="button" class="btn btn-primary analyze-btn" onclick="billboardAI.analyzeImage('${imageData.id}')">
                        <i data-feather="zap" aria-hidden="true"></i>
                        Analyze
                    </button>
                    <button type="button" class="btn btn-secondary remove-btn" onclick="billboardAI.removeImage('${imageData.id}')" aria-label="Remove image">
                        <i data-feather="trash-2" aria-hidden="true"></i>
                    </button>
                </div>
            </div>
            <div class="analysis-spinner" aria-hidden="true"></div>
        `;

        gallery.appendChild(imageElement);
        
        // Re-initialize Feather icons for new content
        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        // Animate in
        setTimeout(() => {
            imageElement.style.animation = 'fadeIn 0.5s ease-in-out';
        }, 10);
    }

    /**
     * Analyze a specific image
     */
    async analyzeImage(imageId) {
        const imageData = this.state.uploadedImages.get(imageId);
        if (!imageData || imageData.status === 'analyzing') return;

        const imageElement = document.getElementById(imageId);
        if (!imageElement) return;

        try {
            // Update UI to show analyzing state
            imageData.status = 'analyzing';
            imageElement.classList.add('analyzing');
            
            const analyzeBtn = imageElement.querySelector('.analyze-btn');
            if (analyzeBtn) {
                analyzeBtn.disabled = true;
                analyzeBtn.innerHTML = '<div class="spinner"></div> Analyzing...';
            }

            // Add status indicator
            this.updateImageStatus(imageElement, 'analyzing');

            // Simulate AI analysis (replace with actual API call)
            await this.performAnalysis(imageData);

            // Update result
            const result = Math.random() > 0.5 ? 'authorized' : 'unauthorized';
            const confidence = (Math.random() * 20 + 80).toFixed(1); // 80-100%

            imageData.status = result;
            imageData.confidence = confidence;
            imageData.analyzedAt = new Date().toISOString();

            // Update UI
            imageElement.classList.remove('analyzing');
            imageElement.classList.add('analyzed');
            this.updateImageStatus(imageElement, result);

            // Remove analyze button
            if (analyzeBtn) {
                analyzeBtn.remove();
            }

            // Add to history
            this.addToHistory(imageData);

            // Show success message
            this.showToast(`Analysis complete: ${result} (${confidence}% confidence)`, 'success');

        } catch (error) {
            console.error('Analysis failed:', error);
            imageData.status = 'error';
            imageElement.classList.remove('analyzing');
            this.updateImageStatus(imageElement, 'error');
            this.showToast('Analysis failed. Please try again.', 'error');
        }

        this.updateStats();
    }

    /**
     * Perform analysis (placeholder for actual AI processing)
     */
    async performAnalysis(imageData) {
        // Simulate processing time
        const processingTime = Math.random() * 3000 + 2000; // 2-5 seconds
        await new Promise(resolve => setTimeout(resolve, processingTime));

        // Here you would integrate with actual AI service
        // Example: await this.callAIService(imageData.url);
    }

    /**
     * Update image status indicator
     */
    updateImageStatus(imageElement, status) {
        let existingStatus = imageElement.querySelector('.image-status');
        if (existingStatus) {
            existingStatus.remove();
        }

        if (status === 'pending') return;

        const statusElement = document.createElement('div');
        statusElement.className = `image-status ${status}`;
        
        const statusText = {
            analyzing: 'Analyzing...',
            authorized: 'Authorized',
            unauthorized: 'Unauthorized',
            error: 'Error'
        };

        statusElement.textContent = statusText[status] || status;
        imageElement.appendChild(statusElement);
    }

    /**
     * Remove image from gallery
     */
    removeImage(imageId) {
        const imageElement = document.getElementById(imageId);
        if (imageElement) {
            imageElement.style.animation = 'fadeOut 0.3s ease-in-out';
            setTimeout(() => {
                imageElement.remove();
                this.state.uploadedImages.delete(imageId);
            }, 300);
        }
    }

    /**
     * Analyze all pending images
     */
    async analyzeAllPendingImages() {
        const pendingImages = Array.from(this.state.uploadedImages.values())
            .filter(img => img.status === 'pending');

        for (const imageData of pendingImages) {
            await this.analyzeImage(imageData.id);
            // Small delay between analyses to prevent overwhelming the UI
            await new Promise(resolve => setTimeout(resolve, 500));
        }
    }

    /**
     * Add analysis result to history
     */
    addToHistory(imageData) {
        const historyItem = {
            id: imageData.id,
            name: imageData.name,
            status: imageData.status,
            confidence: imageData.confidence,
            date: imageData.analyzedAt,
            size: imageData.size
        };

        this.analysisHistory.unshift(historyItem);
        this.saveAnalysisHistory();
        this.updateHistory();
    }

    /**
     * Update statistics display
     */
    updateStats() {
        const total = this.analysisHistory.length;
        const authorized = this.analysisHistory.filter(item => item.status === 'authorized').length;
        const unauthorized = this.analysisHistory.filter(item => item.status === 'unauthorized').length;

        const elements = {
            'total-analyzed': total,
            'authorized-count': authorized,
            'unauthorized-count': unauthorized
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = this.elements[id];
            if (element) {
                this.animateNumber(element, parseInt(element.textContent) || 0, value);
            }
        });
    }

    /**
     * Animate number changes
     */
    animateNumber(element, from, to) {
        const duration = 1000;
        const start = Date.now();
        const difference = to - from;

        const animate = () => {
            const elapsed = Date.now() - start;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(from + difference * this.easeOutQuart(progress));
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };

        animate();
    }

    /**
     * Easing function for animations
     */
    easeOutQuart(t) {
        return 1 - (--t) * t * t * t;
    }

    /**
     * Update history display
     */
    updateHistory() {
        const historyContent = this.elements['history-content'];
        if (!historyContent) return;

        if (this.analysisHistory.length === 0) {
            historyContent.innerHTML = `
                <div class="empty-state">
                    <i data-feather="folder" aria-hidden="true"></i>
                    <h3>No analysis results yet</h3>
                    <p>Upload and analyze some billboard images to see your history here</p>
                </div>
            `;
        } else {
            historyContent.innerHTML = `
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Image Name</th>
                            <th>Status</th>
                            <th>Confidence</th>
                            <th>Date</th>
                            <th>Size</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${this.analysisHistory.map(item => `
                            <tr>
                                <td title="${item.name}">${this.truncateText(item.name, 25)}</td>
                                <td>
                                    <span class="history-status ${item.status}">
                                        <i data-feather="${item.status === 'authorized' ? 'check-circle' : 'x-circle'}" aria-hidden="true"></i>
                                        ${item.status}
                                    </span>
                                </td>
                                <td>${item.confidence}%</td>
                                <td>${this.formatDate(item.date)}</td>
                                <td>${this.formatFileSize(item.size)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    /**
     * Filter history based on search term
     */
    filterHistory(searchTerm) {
        if (!searchTerm.trim()) {
            this.updateHistory();
            return;
        }

        const filtered = this.analysisHistory.filter(item =>
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        );

        const historyContent = this.elements['history-content'];
        if (!historyContent) return;

        if (filtered.length === 0) {
            historyContent.innerHTML = `
                <div class="empty-state">
                    <i data-feather="search" aria-hidden="true"></i>
                    <h3>No matching results</h3>
                    <p>No analysis results match "${searchTerm}"</p>
                </div>
            `;
        } else {
            historyContent.innerHTML = `
                <table class="history-table">
                    <thead>
                        <tr>
                            <th>Image Name</th>
                            <th>Status</th>
                            <th>Confidence</th>
                            <th>Date</th>
                            <th>Size</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${filtered.map(item => `
                            <tr>
                                <td title="${item.name}">${this.truncateText(item.name, 25)}</td>
                                <td>
                                    <span class="history-status ${item.status}">
                                        <i data-feather="${item.status === 'authorized' ? 'check-circle' : 'x-circle'}" aria-hidden="true"></i>
                                        ${item.status}
                                    </span>
                                </td>
                                <td>${item.confidence}%</td>
                                <td>${this.formatDate(item.date)}</td>
                                <td>${this.formatFileSize(item.size)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }

        if (typeof feather !== 'undefined') {
            feather.replace();
        }
    }

    /**
     * Export history to CSV
     */
    exportToCSV() {
        if (this.analysisHistory.length === 0) {
            this.showToast('No data to export', 'warning');
            return;
        }

        try {
            const headers = ['Image Name', 'Status', 'Confidence (%)', 'Date', 'File Size (bytes)'];
            const csvContent = [
                headers.join(','),
                ...this.analysisHistory.map(item => [
                    `"${item.name.replace(/"/g, '""')}"`,
                    item.status,
                    item.confidence,
                    `"${item.date}"`,
                    item.size
                ].join(','))
            ].join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);
            
            link.setAttribute('href', url);
            link.setAttribute('download', `billboard_analysis_${new Date().toISOString().split('T')[0]}.csv`);
            link.style.visibility = 'hidden';
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            this.showToast('History exported successfully!', 'success');
        } catch (error) {
            console.error('Export failed:', error);
            this.showToast('Failed to export data', 'error');
        }
    }

    /**
     * Update profile section
     */
    updateProfileSection() {
        const profileLoggedIn = this.elements['profile-logged-in'];
        const profileLoggedOut = this.elements['profile-logged-out'];

        if (this.currentUser) {
            if (profileLoggedIn) {
                profileLoggedIn.style.display = 'block';
                this.updateElement('profile-username', this.currentUser.username || 'Unknown');
                this.updateElement('profile-email', this.currentUser.email || 'Unknown');
                this.updateElement('profile-role', this.currentUser.role || 'User');
            }
            if (profileLoggedOut) {
                profileLoggedOut.style.display = 'none';
            }
        } else {
            if (profileLoggedIn) {
                profileLoggedIn.style.display = 'none';
            }
            if (profileLoggedOut) {
                profileLoggedOut.style.display = 'block';
            }
        }
    }

    /**
     * Update settings form with current values
     */
    updateSettingsForm() {
        this.updateElement('theme-select', this.settings.theme);
        this.updateElement('max-file-size', this.settings.maxFileSize);
        this.updateElement('file-size-value', `${this.settings.maxFileSize} MB`);
        
        const notifications = this.elements['notifications'];
        if (notifications) {
            notifications.checked = this.settings.notifications;
        }

        const autoAnalyze = this.elements['auto-analyze'];
        if (autoAnalyze) {
            autoAnalyze.checked = this.settings.autoAnalyze;
        }
    }

    /**
     * Handle settings form submission
     */
    handleSettingsSubmit(e) {
        e.preventDefault();

        const formData = new FormData(e.target);
        
        this.settings = {
            theme: this.elements['theme-select']?.value || 'light',
            notifications: this.elements['notifications']?.checked || false,
            maxFileSize: parseInt(this.elements['max-file-size']?.value) || 10,
            autoAnalyze: this.elements['auto-analyze']?.checked || false
        };

        this.saveSettings();
    }

    /**
     * Handle user logout
     */
    handleLogout() {
        if (confirm('Are you sure you want to logout?')) {
            this.currentUser = null;
            localStorage.removeItem('currentUser');
            this.updateProfileSection();
            this.showToast('Logged out successfully', 'success');
        }
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 5000) {
        const toastContainer = this.elements['toast-container'];
        if (!toastContainer) return;

        const toastId = `toast_${Date.now()}`;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.id = toastId;
        
        const icons = {
            success: 'check-circle',
            error: 'x-circle',
            warning: 'alert-triangle',
            info: 'info'
        };

        toast.innerHTML = `
            <div class="toast-icon">
                <i data-feather="${icons[type] || 'info'}" aria-hidden="true"></i>
            </div>
            <div class="toast-content">
                <p>${message}</p>
            </div>
            <button type="button" class="toast-close" onclick="billboardAI.closeToast('${toastId}')" aria-label="Close notification">
                <i data-feather="x" aria-hidden="true"></i>
            </button>
        `;

        toastContainer.appendChild(toast);

        if (typeof feather !== 'undefined') {
            feather.replace();
        }

        // Auto-remove after duration
        setTimeout(() => {
            this.closeToast(toastId);
        }, duration);

        // Announce to screen readers
        if (this.settings.notifications) {
            this.announceToScreenReader(message);
        }
    }

    /**
     * Close toast notification
     */
    closeToast(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.style.animation = 'slideOut 0.3s ease-in-out';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }
    }

    /**
     * Announce message to screen readers
     */
    announceToScreenReader(message) {
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.position = 'absolute';
        announcement.style.left = '-9999px';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        setTimeout(() => {
            document.body.removeChild(announcement);
        }, 1000);
    }

    /**
     * Utility: Update element content safely
     */
    updateElement(id, value) {
        const element = this.elements[id] || document.getElementById(id);
        if (element) {
            if (element.tagName === 'INPUT' || element.tagName === 'SELECT') {
                element.value = value;
            } else {
                element.textContent = value;
            }
        }
    }

    /**
     * Utility: Truncate text
     */
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substr(0, maxLength - 3) + '...';
    }

    /**
     * Utility: Format date
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    /**
     * Utility: Format file size
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Global functions for backwards compatibility and HTML onclick handlers
window.showToast = (message, type, duration) => {
    if (window.billboardAI) {
        window.billboardAI.showToast(message, type, duration);
    }
};

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    window.billboardAI = new BillboardAI();
});

// Add CSS animation keyframes programmatically
const style = document.createElement('style');
style.textContent = `
@keyframes fadeOut {
    from { opacity: 1; transform: translateY(0); }
    to { opacity: 0; transform: translateY(-10px); }
}

@keyframes slideOut {
    from { 
        opacity: 1; 
        transform: translateX(0); 
    }
    to { 
        opacity: 0; 
        transform: translateX(100%); 
    }
}
`;
document.head.appendChild(style);
