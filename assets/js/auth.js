/**
 * Authentication Module for Portfolio Website
 * Author: Md. Shahriar Rakib Rabbi
 * 
 * This file handles the authentication system for the portfolio admin area,
 * including login, logout, token management, and session validation.
 */

// Namespace to prevent global scope pollution
const Auth = (function() {
    // Configuration
    const config = {
        tokenName: 'portfolio_auth_token',
        refreshTokenName: 'portfolio_refresh_token',
        userDataName: 'portfolio_user',
        tokenExpiry: 'portfolio_token_expiry',
        authEndpoint: 'data/auth.json', // In a real app, this would be an API endpoint
        loginRedirect: '/admin/dashboard.html',
        logoutRedirect: '/admin/index.html',
        unauthorizedRedirect: '/admin/index.html',
        sessionTimeout: 3600000, // 1 hour in milliseconds
        refreshThreshold: 300000 // 5 minutes before expiry
    };

    /**
     * Check if user is currently authenticated
     * @returns {boolean} Authentication status
     */
    function isAuthenticated() {
        const token = localStorage.getItem(config.tokenName);
        const expiry = localStorage.getItem(config.tokenExpiry);
        
        if (!token || !expiry) {
            return false;
        }
        
        // Check if token has expired
        return parseInt(expiry) > Date.now();
    }
    
    /**
     * Attempt to login with provided credentials
     * @param {string} username - Username to login with
     * @param {string} password - Password to authenticate with
     * @param {boolean} rememberMe - Whether to extend session duration
     * @returns {Promise} Promise resolving to authentication result
     */
    function login(username, password, rememberMe = false) {
        return new Promise((resolve, reject) => {
            // In a real application, this would be an API call
            // For this demo, we'll use the data-loader to fetch auth data
            
            if (typeof loadData !== 'function') {
                reject(new Error('Data loader not available'));
                return;
            }
            
            loadData(config.authEndpoint)
                .then(authData => {
                    // Find matching user
                    const user = authData.users.find(u => 
                        u.username === username && u.password === password
                    );
                    
                    if (user) {
                        // Generate demo token
                        const token = generateToken();
                        const refreshToken = generateToken();
                        
                        // Calculate expiry
                        const now = Date.now();
                        const expiry = now + (rememberMe ? config.sessionTimeout * 24 : config.sessionTimeout);
                        
                        // Store auth data
                        localStorage.setItem(config.tokenName, token);
                        localStorage.setItem(config.refreshTokenName, refreshToken);
                        localStorage.setItem(config.tokenExpiry, expiry.toString());
                        
                        // Store user data without sensitive information
                        const safeUserData = {
                            id: user.id,
                            username: user.username,
                            name: user.name,
                            role: user.role,
                            email: user.email,
                            avatar: user.avatar,
                            lastLogin: now
                        };
                        
                        localStorage.setItem(config.userDataName, JSON.stringify(safeUserData));
                        
                        // Set up auto refresh for token
                        setUpTokenRefresh(expiry);
                        
                        resolve({
                            success: true,
                            message: "Login successful",
                            user: safeUserData
                        });
                    } else {
                        reject({
                            success: false,
                            message: "Invalid username or password"
                        });
                    }
                })
                .catch(error => {
                    reject({
                        success: false,
                        message: "Authentication failed",
                        error: error
                    });
                });
        });
    }
    
    /**
     * Log out the current user
     * @param {boolean} redirect - Whether to redirect after logout
     * @returns {boolean} Success status
     */
    function logout(redirect = true) {
        // Clear auth data
        localStorage.removeItem(config.tokenName);
        localStorage.removeItem(config.refreshTokenName);
        localStorage.removeItem(config.tokenExpiry);
        localStorage.removeItem(config.userDataName);
        
        // Clear any token refresh timers
        if (window.tokenRefreshTimer) {
            clearTimeout(window.tokenRefreshTimer);
        }
        
        // Redirect if requested
        if (redirect) {
            window.location.href = config.logoutRedirect;
        }
        
        return true;
    }
    
    /**
     * Get current user data
     * @returns {Object|null} User data or null if not authenticated
     */
    function getCurrentUser() {
        if (!isAuthenticated()) {
            return null;
        }
        
        try {
            const userData = localStorage.getItem(config.userDataName);
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }
    
    /**
     * Set up token auto-refresh
     * @param {number} expiry - Token expiry timestamp
     */
    function setUpTokenRefresh(expiry) {
        // Clear any existing timer
        if (window.tokenRefreshTimer) {
            clearTimeout(window.tokenRefreshTimer);
        }
        
        // Calculate time until refresh (configured threshold before expiry)
        const now = Date.now();
        const timeToRefresh = Math.max(0, expiry - now - config.refreshThreshold);
        
        // Set up timer to refresh token
        window.tokenRefreshTimer = setTimeout(() => {
            refreshToken();
        }, timeToRefresh);
    }
    
    /**
     * Refresh the authentication token
     * @returns {Promise} Promise resolving to refresh result
     */
    function refreshToken() {
        return new Promise((resolve, reject) => {
            // In a real application, this would send the refresh token to an API
            // For this demo, we'll just generate a new token and extend expiry
            
            const refreshToken = localStorage.getItem(config.refreshTokenName);
            if (!refreshToken) {
                reject({
                    success: false,
                    message: "No refresh token found"
                });
                return;
            }
            
            // Generate new token
            const token = generateToken();
            const newRefreshToken = generateToken();
            
            // Calculate new expiry
            const now = Date.now();
            const expiry = now + config.sessionTimeout;
            
            // Store updated auth data
            localStorage.setItem(config.tokenName, token);
            localStorage.setItem(config.refreshTokenName, newRefreshToken);
            localStorage.setItem(config.tokenExpiry, expiry.toString());
            
            // Set up next token refresh
            setUpTokenRefresh(expiry);
            
            resolve({
                success: true,
                message: "Token refreshed",
                expiry: expiry
            });
        });
    }
    
    /**
     * Generate a random token
     * @returns {string} Generated token
     */
    function generateToken() {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let token = 'tk_';
        for (let i = 0; i < 32; i++) {
            token += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return token;
    }
    
    /**
     * Check if current user has required role
     * @param {string|Array} requiredRole - Role or roles required
     * @returns {boolean} Whether user has required role
     */
    function hasRole(requiredRole) {
        const user = getCurrentUser();
        if (!user) return false;
        
        if (Array.isArray(requiredRole)) {
            return requiredRole.includes(user.role);
        }
        
        return user.role === requiredRole;
    }
    
    /**
     * Protect a page by redirecting if not authenticated
     * @param {string|Array} requiredRole - Optional role requirement
     * @returns {boolean} Authentication status
     */
    function protectPage(requiredRole) {
        if (!isAuthenticated()) {
            // Redirect to login page with return URL
            const returnUrl = encodeURIComponent(window.location.pathname);
            window.location.href = `${config.unauthorizedRedirect}?returnUrl=${returnUrl}`;
            return false;
        }
        
        // Check role if specified
        if (requiredRole && !hasRole(requiredRole)) {
            // Redirect to unauthorized page
            window.location.href = config.unauthorizedRedirect;
            return false;
        }
        
        return true;
    }
    
    /**
     * Initialize the authentication system
     */
    function init() {
        // Handle session expiry while page is open
        window.addEventListener('storage', function(event) {
            if (event.key === config.tokenName && event.newValue === null) {
                // Token was removed in another tab
                window.location.reload();
            }
        });
        
        // Check for token expiry and set up refresh if needed
        if (isAuthenticated()) {
            const expiry = parseInt(localStorage.getItem(config.tokenExpiry));
            setUpTokenRefresh(expiry);
        }
        
        // Auto-redirect from login page if already authenticated
        const isLoginPage = window.location.pathname.includes(config.logoutRedirect);
        if (isAuthenticated() && isLoginPage) {
            // Check for intended destination
            const urlParams = new URLSearchParams(window.location.search);
            const returnUrl = urlParams.get('returnUrl');
            
            window.location.href = returnUrl || config.loginRedirect;
        }
    }
    
    /**
     * Get authentication token (for API requests)
     * @returns {string|null} Current auth token
     */
    function getToken() {
        return isAuthenticated() ? localStorage.getItem(config.tokenName) : null;
    }
    
    /**
     * Update stored user data
     * @param {Object} userData - Updated user data
     * @returns {boolean} Success status
     */
    function updateUserData(userData) {
        if (!isAuthenticated()) {
            return false;
        }
        
        try {
            const currentData = getCurrentUser();
            const updatedData = { ...currentData, ...userData };
            localStorage.setItem(config.userDataName, JSON.stringify(updatedData));
            return true;
        } catch (error) {
            console.error('Error updating user data:', error);
            return false;
        }
    }

    // Initialize on script load
    init();
    
    // Public API
    return {
        isAuthenticated,
        login,
        logout,
        getCurrentUser,
        hasRole,
        protectPage,
        getToken,
        refreshToken,
        updateUserData
    };
})();

// Handle login form submission
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            // Get form inputs
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('remember-me')?.checked || false;
            
            // Disable submit button and show loading state
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Logging in...';
            
            // Clear previous error messages
            const errorContainer = document.getElementById('login-error');
            if (errorContainer) {
                errorContainer.textContent = '';
                errorContainer.style.display = 'none';
            }
            
            // Attempt login
            Auth.login(username, password, rememberMe)
                .then(result => {
                    // Get redirect URL from query parameters or use default
                    const urlParams = new URLSearchParams(window.location.search);
                    const returnUrl = urlParams.get('returnUrl');
                    
                    // Redirect to dashboard or specified return URL
                    window.location.href = returnUrl || '/admin/dashboard.html';
                })
                .catch(error => {
                    // Show error message
                    if (errorContainer) {
                        errorContainer.textContent = error.message || 'Login failed';
                        errorContainer.style.display = 'block';
                    }
                    
                    // Reset button
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = originalBtnText;
                });
        });
    }
    
    // Handle logout button clicks
    const logoutButtons = document.querySelectorAll('.logout-button');
    logoutButtons.forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            Auth.logout();
        });
    });
    
    // Update UI with user info if logged in
    const userInfoContainers = document.querySelectorAll('.user-info');
    if (userInfoContainers.length > 0 && Auth.isAuthenticated()) {
        const user = Auth.getCurrentUser();
        
        userInfoContainers.forEach(container => {
            const nameElement = container.querySelector('.user-name');
            const roleElement = container.querySelector('.user-role');
            const avatarElement = container.querySelector('.user-avatar');
            
            if (nameElement && user.name) {
                nameElement.textContent = user.name;
            }
            
            if (roleElement && user.role) {
                roleElement.textContent = user.role;
            }
            
            if (avatarElement && user.avatar) {
                avatarElement.src = user.avatar;
                avatarElement.alt = user.name || user.username;
            }
        });
    }
    
    // Protect admin pages (except login page)
    const isLoginPage = window.location.pathname.includes('/admin/index.html');
    if (!isLoginPage && window.location.pathname.includes('/admin/')) {
        Auth.protectPage();
    }
});

/**
 * Add authentication headers to fetch requests
 * @param {string} url - URL to fetch
 * @param {Object} options - Fetch options
 * @returns {Promise} - Fetch promise
 */
function authenticatedFetch(url, options = {}) {
    // Skip auth for public endpoints
    if (url.includes('/data/') && !url.includes('/admin/')) {
        return fetch(url, options);
    }
    
    // Get token
    const token = Auth.getToken();
    if (!token) {
        // Redirect to login if no token for protected endpoints
        if (url.includes('/admin/')) {
            Auth.logout(true);
        }
        return fetch(url, options);
    }
    
    // Add authorization header
    const authOptions = {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`
        }
    };
    
    return fetch(url, authOptions)
        .then(response => {
            // Handle 401 Unauthorized
            if (response.status === 401) {
                // Try to refresh token
                return Auth.refreshToken()
                    .then(() => {
                        // Retry with new token
                        authOptions.headers['Authorization'] = `Bearer ${Auth.getToken()}`;
                        return fetch(url, authOptions);
                    })
                    .catch(() => {
                        // If refresh fails, logout
                        Auth.logout(true);
                        return response;
                    });
            }
            return response;
        });
}

// Export as global
window.Auth = Auth;
window.authenticatedFetch = authenticatedFetch;