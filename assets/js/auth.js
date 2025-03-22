/**
 * Authentication Module
 * Handles user authentication with secure password handling
 * @author: Md. Shahriar Rakib Rabbi
 */

const AuthModule = (function() {
    // Private variables
    const SESSION_KEY = 'auth_session';
    const AUTH_DATA_PATH = '../data/auth.json';
    let currentUser = null;

    /**
     * Initialize the authentication module
     */
    async function init() {
        // Check if we're on login page or admin page
        const isLoginPage = window.location.pathname.endsWith('index.html') && 
                           window.location.pathname.includes('/admin/');
        
        if (!isLoginPage) {
            // Check session on admin pages
            await checkSession();
        }

        // Bind login form events if on login page
        if (isLoginPage) {
            const loginForm = document.getElementById('login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', handleLogin);
            }
        }
    }

    /**
     * Handle login form submission
     * @param {Event} e - The submit event
     */
    async function handleLogin(e) {
        e.preventDefault();

        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const submitBtn = document.querySelector('#login-form .btn-submit');
        const rememberMe = document.getElementById('remember-me');
        
        // Basic validation
        if (!usernameInput.value.trim() || !passwordInput.value.trim()) {
            showLoginError('Please enter both username and password');
            return;
        }

        // Show loading state
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';
        clearLoginError();

        try {
            // Authenticate user
            const user = await authenticateUser(usernameInput.value, passwordInput.value);
            
            if (user) {
                // Create session
                createSession(user, rememberMe?.checked);
                
                // Show success message
                showLoginSuccess('Login successful! Redirecting...');
                
                // Redirect after a short delay
                setTimeout(() => {
                    window.location.href = 'dashboard.html';
                }, 1000);
            } else {
                // Show error
                showLoginError('Invalid username or password');
                submitBtn.disabled = false;
                submitBtn.innerHTML = 'Login';
            }
        } catch (error) {
            showLoginError(`Authentication error: ${error.message}`);
            submitBtn.disabled = false;
            submitBtn.innerHTML = 'Login';
        }
    }

    /**
     * Authenticate a user with username and password
     * @param {string} username - The username to authenticate
     * @param {string} password - The password to authenticate
     * @returns {Promise<Object|null>} The authenticated user or null
     */
    async function authenticateUser(username, password) {
        try {
            // Fetch authentication data
            const response = await fetch(AUTH_DATA_PATH);
            if (!response.ok) {
                throw new Error('Authentication data not available');
            }
            
            const authData = await response.json();
            const users = authData.users || [];
            
            // Find the user
            const user = users.find(u => u.username === username);
            if (!user) {
                return null;
            }
            
            // Verify the password using PBKDF2
            const isValid = await verifyPassword(password, user.password);
            
            if (isValid) {
                // Return user data (excluding password)
                const { password: _, ...userData } = user;
                return userData;
            }
            
            return null;
        } catch (error) {
            console.error('Authentication error:', error);
            throw error;
        }
    }

    /**
     * Verify a password against a stored hash
     * @param {string} password - The password to verify
     * @param {string} storedHash - The stored hash (format: algorithm:iterations:salt:hash)
     * @returns {Promise<boolean>} True if the password is valid
     */
    async function verifyPassword(password, storedHash) {
        try {
            // Split the hash into its components
            const [algorithm, iterations, salt, hash] = storedHash.split(':');
            
            // Verify algorithm is supported
            if (algorithm !== 'PBKDF2') {
                throw new Error('Unsupported hash algorithm');
            }
            
            // Convert iterations to number
            const iterCount = parseInt(iterations, 10);
            
            // Convert salt to Uint8Array
            const saltArray = base64ToUint8Array(salt);
            
            // Hash the input password with the same parameters
            const derivedKey = await pbkdf2(password, saltArray, iterCount);
            
            // Convert to base64 for comparison
            const derivedHash = uint8ArrayToBase64(derivedKey);
            
            // Compare the hashes
            return derivedHash === hash;
        } catch (error) {
            console.error('Password verification error:', error);
            return false;
        }
    }

    /**
     * Hash a password using PBKDF2
     * @param {string} password - The password to hash
     * @returns {Promise<string>} The hashed password in format: algorithm:iterations:salt:hash
     */
    async function hashPassword(password) {
        try {
            // Generate a random salt
            const saltArray = crypto.getRandomValues(new Uint8Array(16));
            
            // Number of iterations
            const iterations = 310000;
            
            // Derive key using PBKDF2
            const keyArray = await pbkdf2(password, saltArray, iterations);
            
            // Convert salt and key to base64
            const saltBase64 = uint8ArrayToBase64(saltArray);
            const keyBase64 = uint8ArrayToBase64(keyArray);
            
            // Format: algorithm:iterations:salt:hash
            return `PBKDF2:${iterations}:${saltBase64}:${keyBase64}`;
        } catch (error) {
            console.error('Password hashing error:', error);
            throw error;
        }
    }

    /**
     * Implement PBKDF2 key derivation
     * @param {string} password - The password to hash
     * @param {Uint8Array} salt - The salt to use
     * @param {number} iterations - The number of iterations
     * @returns {Promise<Uint8Array>} The derived key
     */
    async function pbkdf2(password, salt, iterations) {
        try {
            // Convert password to an ArrayBuffer
            const encoder = new TextEncoder();
            const passwordBuffer = encoder.encode(password);
            
            // Import the password as a key
            const baseKey = await crypto.subtle.importKey(
                'raw', 
                passwordBuffer, 
                { name: 'PBKDF2' }, 
                false, 
                ['deriveBits']
            );
            
            // Derive bits using PBKDF2
            const derivedBits = await crypto.subtle.deriveBits(
                {
                    name: 'PBKDF2',
                    salt: salt,
                    iterations: iterations,
                    hash: 'SHA-256'
                },
                baseKey,
                256 // 32 bytes (256 bits)
            );
            
            // Convert to Uint8Array
            return new Uint8Array(derivedBits);
        } catch (error) {
            console.error('PBKDF2 error:', error);
            throw error;
        }
    }

    /**
     * Create a session for an authenticated user
     * @param {Object} user - The authenticated user
     * @param {boolean} remember - Whether to remember the user
     */
    function createSession(user, remember) {
        currentUser = user;
        
        // Create session object
        const session = {
            user,
            expires: remember 
                ? new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
                : new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),   // 1 day
            token: generateSessionToken()
        };
        
        // Save to localStorage
        localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }

    /**
     * Generate a random session token
     * @returns {string} A random token
     */
    function generateSessionToken() {
        const array = new Uint8Array(24);
        crypto.getRandomValues(array);
        return uint8ArrayToBase64(array);
    }

    /**
     * Check if there is a valid session
     * @returns {Promise<boolean>} True if the session is valid
     */
    async function checkSession() {
        const sessionData = localStorage.getItem(SESSION_KEY);
        
        if (!sessionData) {
            redirectToLogin();
            return false;
        }
        
        try {
            const session = JSON.parse(sessionData);
            
            // Check if session has expired
            if (new Date(session.expires) < new Date()) {
                logout();
                redirectToLogin('Your session has expired. Please login again.');
                return false;
            }
            
            // Set current user
            currentUser = session.user;
            return true;
        } catch (error) {
            console.error('Session check error:', error);
            logout();
            redirectToLogin('Invalid session. Please login again.');
            return false;
        }
    }

    /**
     * Redirect to login page
     * @param {string} message - Optional error message to display
     */
    function redirectToLogin(message) {
        // Only redirect if not already on login page
        if (!window.location.pathname.endsWith('index.html')) {
            if (message) {
                // Store message to display after redirect
                sessionStorage.setItem('login_message', message);
            }
            
            window.location.href = 'index.html';
        } else if (message) {
            // Already on login page, show message
            showLoginError(message);
        }
    }

    /**
     * Log the user out
     * @returns {Promise<void>}
     */
    async function logout() {
        // Clear current user
        currentUser = null;
        
        // Remove session from localStorage
        localStorage.removeItem(SESSION_KEY);
        
        // For security, we'll also remove any GitHub tokens
        localStorage.removeItem('github_credentials');
        
        return Promise.resolve();
    }

    /**
     * Get the current user session
     * @returns {Object|null} The current user session
     */
    function getCurrentSession() {
        const sessionData = localStorage.getItem(SESSION_KEY);
        
        if (sessionData) {
            try {
                return JSON.parse(sessionData);
            } catch (error) {
                console.error('Error parsing session data:', error);
            }
        }
        
        return null;
    }

    /**
     * Show a login error message
     * @param {string} message - The error message
     */
    function showLoginError(message) {
        const errorElement = document.getElementById('login-error');
        if (errorElement) {
            errorElement.textContent = message;
            errorElement.classList.remove('hidden');
        }
    }

    /**
     * Show a login success message
     * @param {string} message - The success message
     */
    function showLoginSuccess(message) {
        const errorElement = document.getElementById('login-error');
        const successElement = document.getElementById('login-success');
        
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
        
        if (successElement) {
            successElement.textContent = message;
            successElement.classList.remove('hidden');
        }
    }

    /**
     * Clear login error messages
     */
    function clearLoginError() {
        const errorElement = document.getElementById('login-error');
        const successElement = document.getElementById('login-success');
        
        if (errorElement) {
            errorElement.classList.add('hidden');
        }
        
        if (successElement) {
            successElement.classList.add('hidden');
        }
    }

    /**
     * Convert a Uint8Array to base64 string
     * @param {Uint8Array} array - The array to convert
     * @returns {string} The base64 string
     */
    function uint8ArrayToBase64(array) {
        return btoa(String.fromCharCode.apply(null, array));
    }

    /**
     * Convert a base64 string to Uint8Array
     * @param {string} base64 - The base64 string
     * @returns {Uint8Array} The resulting array
     */
    function base64ToUint8Array(base64) {
        const binary = atob(base64);
        const array = new Uint8Array(binary.length);
        
        for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
        }
        
        return array;
    }

    // Check for stored message when the page loads
    window.addEventListener('DOMContentLoaded', function() {
        const message = sessionStorage.getItem('login_message');
        if (message) {
            showLoginError(message);
            sessionStorage.removeItem('login_message');
        }
        
        // Initialize the module
        init();
    });

    // Public API
    return {
        login: authenticateUser,
        logout,
        getCurrentSession,
        hashPassword,
        verifyPassword
    };
})();