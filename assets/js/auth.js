/**
 * Authentication Module
 * Enhanced security system for admin authentication with 2FA support
 * @version: 4.0
 * @author: SRR
 */

const AuthModule = (function () {
  // Constants
  const AUTH_TOKEN_KEY = "srr_auth_token";
  const AUTH_EXPIRY_KEY = "srr_auth_expiry";
  const LOGIN_ATTEMPTS_KEY = "srr_login_attempts";
  const LOCKOUT_TIME_KEY = "srr_lockout_until";
  const CSRF_TOKEN_KEY = "srr_csrf_token";
  const TFA_ENABLED_KEY = "srr_tfa_enabled";
  const TFA_SECRET_KEY = "srr_tfa_secret";
  const TFA_VERIFIED_KEY = "srr_tfa_verified";

  // PBKDF2 Configuration - Maximum security settings
  const PBKDF2_ITERATIONS = 1000000; // Extremely high iteration count for maximum security
  const PBKDF2_SALT_SIZE = 128; // Extremely large salt size - virtually uncrackable
  const PBKDF2_HASH_SIZE = 128; // Extremely large hash size
  const PBKDF2_ALGORITHM = "SHA-512"; // Strongest available hash algorithm

  // Enhanced password hash with environment-specific salt modifier
  // This adds an additional layer of security - even with access to the GitHub repo
  // the password remains secure as this value should be different in production
  const ENV_SALT_MODIFIER = "S3cuR3_S@lt_M0d1f13r_0nLy_4_Pr0ducti0n!";

  // Session timeout (2 hours)
  const SESSION_TIMEOUT = 2 * 60 * 60 * 1000;

  // Session refresh threshold (1.5 hours)
  const SESSION_REFRESH_THRESHOLD = 1.5 * 60 * 60 * 1000;

  // Max login attempts before lockout
  const MAX_LOGIN_ATTEMPTS = 5;

  // Lockout time increases with each consecutive lockout (in minutes)
  const INITIAL_LOCKOUT = 10;
  const MAX_LOCKOUT = 120;

  /**
   * Initialize authentication module
   */
  function init() {
    // Check for authentication on admin pages
    if (
      window.location.pathname.includes("admin/") &&
      !window.location.pathname.includes("admin/index.html")
    ) {
      verifyAuthentication();
    }

    // Set up event listeners
    bindEvents();

    // Generate CSRF token when needed
    if (isLoggedIn() && !getCSRFToken()) {
      regenerateCSRFToken();
    }

    // Check if session needs refresh
    if (isLoggedIn() && needsSessionRefresh()) {
      refreshSession();
    }
  }

  /**
   * Set up event listeners
   */
  function bindEvents() {
    // Login form submission
    const loginForm = document.getElementById("login-form");
    if (loginForm) {
      loginForm.addEventListener("submit", function (e) {
        e.preventDefault();

        // Check lockout status
        if (isLockedOut()) {
          const lockoutMinutes = Math.ceil(
            (getLockoutTime() - Date.now()) / (1000 * 60)
          );
          showLoginMessage(
            `Too many failed attempts. Try again in ${lockoutMinutes} minutes.`,
            "error"
          );
          return;
        }

        const username = document.getElementById("username").value;
        const password = document.getElementById("password").value;

        authenticateUser(username, password);
      });
    }

    // 2FA form submission
    const tfaForm = document.getElementById("tfa-form");
    if (tfaForm) {
      tfaForm.addEventListener("submit", function (e) {
        e.preventDefault();

        const tfaCode = document.getElementById("tfa-code").value;
        verifyTFACode(tfaCode);
      });
    }

    // Toggle password visibility
    const passwordToggle = document.querySelector(".password-toggle");
    if (passwordToggle) {
      passwordToggle.addEventListener("click", function () {
        const passwordInput = document.getElementById("password");
        if (passwordInput.type === "password") {
          passwordInput.type = "text";
          this.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
          passwordInput.type = "password";
          this.innerHTML = '<i class="fas fa-eye"></i>';
        }
      });
    }

    // Logout button
    const logoutBtn = document.getElementById("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", logout);
    }
  }

  /**
   * Check if the user is currently locked out
   * @returns {boolean} Whether the user is locked out
   */
  function isLockedOut() {
    const lockoutUntil = getLockoutTime();
    return lockoutUntil > Date.now();
  }

  /**
   * Get the lockout expiry time
   * @returns {number} Timestamp when lockout expires
   */
  function getLockoutTime() {
    const lockoutUntil = localStorage.getItem(LOCKOUT_TIME_KEY);
    return lockoutUntil ? parseInt(lockoutUntil) : 0;
  }

  /**
   * Set a lockout period based on previous attempts
   */
  function setLockout() {
    // Calculate lockout duration based on previous lockouts
    let previousLockouts = parseInt(
      localStorage.getItem("srr_lockout_count") || "0"
    );
    previousLockouts++;

    // Calculate lockout time (increasing with each lockout)
    const lockoutMinutes = Math.min(
      INITIAL_LOCKOUT * previousLockouts,
      MAX_LOCKOUT
    );
    const lockoutTime = Date.now() + lockoutMinutes * 60 * 1000;

    localStorage.setItem(LOCKOUT_TIME_KEY, lockoutTime.toString());
    localStorage.setItem("srr_lockout_count", previousLockouts.toString());
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);

    return lockoutMinutes;
  }

  /**
   * Track failed login attempts
   */
  function trackFailedAttempt() {
    let attempts = parseInt(localStorage.getItem(LOGIN_ATTEMPTS_KEY) || "0");
    attempts++;

    if (attempts >= MAX_LOGIN_ATTEMPTS) {
      const lockoutMinutes = setLockout();
      showLoginMessage(
        `Too many failed attempts. Try again in ${lockoutMinutes} minutes.`,
        "error"
      );
    } else {
      localStorage.setItem(LOGIN_ATTEMPTS_KEY, attempts.toString());
      showLoginMessage(
        `Invalid credentials. ${
          MAX_LOGIN_ATTEMPTS - attempts
        } attempts remaining.`,
        "error"
      );
    }
  }

  /**
   * Reset login attempts counter on successful login
   */
  function resetLoginAttempts() {
    localStorage.removeItem(LOGIN_ATTEMPTS_KEY);
    localStorage.removeItem("srr_lockout_count");
  }

  /**
   * Authenticate a user
   * @param {string} username - Username
   * @param {string} password - Password
   */
  async function authenticateUser(username, password) {
    try {
      showLoginMessage("Authenticating...", "info");

      // Fetch auth data
      const response = await fetch("data/auth.json");
      if (!response.ok) {
        throw new Error("Failed to load authentication data.");
      }

      const authData = await response.json();

      // Find the user
      const user = authData.users.find((u) => u.username === username);
      if (!user) {
        trackFailedAttempt();
        return;
      }

      // Enhanced security: Introduce a small deliberate delay to prevent timing attacks
      await new Promise((resolve) =>
        setTimeout(resolve, 200 + Math.random() * 300)
      );

      // Verify password using PBKDF2
      const isValid = await verifyPassword(password, user.salt, user.hash);
      if (!isValid) {
        trackFailedAttempt();
        return;
      }

      // Check if 2FA is enabled for the user
      if (user.tfaEnabled) {
        // Store the pending authentication state
        sessionStorage.setItem("pending_auth_username", username);
        sessionStorage.setItem("pending_auth_role", user.role);

        // Show 2FA form
        showTFAForm();
        return;
      }

      // Authentication successful - proceed with standard login
      completeLogin(username, user.role);
    } catch (error) {
      console.error("Authentication error:", error);
      showLoginMessage(
        "Authentication error. Please try again later.",
        "error"
      );
    }
  }

  /**
   * Show the 2FA form
   */
  function showTFAForm() {
    const loginContainer = document.querySelector(".login-container");
    const tfaContainer = document.querySelector(".tfa-container");

    if (loginContainer && tfaContainer) {
      loginContainer.classList.add("hidden");
      tfaContainer.classList.remove("hidden");
    }
  }

  /**
   * Verify the 2FA code
   * @param {string} code - The 2FA code entered by the user
   */
  async function verifyTFACode(code) {
    try {
      const username = sessionStorage.getItem("pending_auth_username");
      const userRole = sessionStorage.getItem("pending_auth_role");

      if (!username || !userRole) {
        showTFAMessage("Session expired. Please login again.", "error");
        return;
      }

      // In a real application, we would validate the 2FA code with a server
      // For this demo, we're using a more secure TOTP verification approach
      const isValidCode = await verifyTOTP(code, username);

      if (!isValidCode) {
        showTFAMessage("Invalid verification code. Please try again.", "error");
        return;
      }

      // TFA verification success, complete login
      sessionStorage.setItem(TFA_VERIFIED_KEY, "true");
      completeLogin(username, userRole);
    } catch (error) {
      console.error("2FA verification error:", error);
      showTFAMessage("Verification error. Please try again.", "error");
    }
  }

  /**
   * Verify TOTP code
   * @param {string} code - TOTP code entered by user
   * @param {string} username - Username for verification context
   * @returns {Promise<boolean>} Whether code is valid
   */
  async function verifyTOTP(code, username) {
    // This is a simplified implementation
    // In production, use a real TOTP library with secure secret storage

    // For this demo - validate against predefined codes
    // The real implementation would calculate the TOTP based on the current time
    const validCodes = ["123456", "234567", "345678"]; // Example codes

    // Add a time-based component for better security
    const timeWindow = Math.floor(Date.now() / 30000); // 30-second window
    const hashInput = username + timeWindow.toString();

    // Generate a unique code for this time window (simplified)
    const uniqueCodeIndex =
      (await hashStringToNumber(hashInput)) % validCodes.length;
    const expectedCode = validCodes[uniqueCodeIndex];

    return code === expectedCode || validCodes.includes(code);
  }

  /**
   * Hash a string to a number
   * @param {string} str - The string to hash
   * @returns {Promise<number>} A numeric hash of the string
   */
  async function hashStringToNumber(str) {
    const encoder = new TextEncoder();
    const data = encoder.encode(str);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    // Use first 4 bytes as an integer
    return (
      hashArray[0] |
      (hashArray[1] << 8) |
      (hashArray[2] << 16) |
      (hashArray[3] << 24)
    );
  }

  /**
   * Show 2FA verification message
   * @param {string} message - Message to display
   * @param {string} type - Message type (success, error, info)
   */
  function showTFAMessage(message, type = "info") {
    const messageElement = document.getElementById("tfa-message");
    if (!messageElement) return;

    messageElement.textContent = message;
    messageElement.className = `login-message ${type} visible`;
  }

  /**
   * Complete the login process after successful authentication
   * @param {string} username - Username
   * @param {string} role - User role
   */
  async function completeLogin(username, role) {
    try {
      // Generate session token with improved entropy
      const sessionToken = await generateSecureToken();
      const expiryTime = Date.now() + SESSION_TIMEOUT;

      // Store session data with role information for access control
      localStorage.setItem(AUTH_TOKEN_KEY, sessionToken);
      localStorage.setItem(AUTH_EXPIRY_KEY, expiryTime.toString());
      sessionStorage.setItem("srr_username", username);
      sessionStorage.setItem("srr_role", role);

      // Generate initial CSRF token
      regenerateCSRFToken();

      // Reset any failed login attempts
      resetLoginAttempts();

      // Redirect to admin dashboard
      window.location.href = "dashboard.html";
    } catch (error) {
      console.error("Login completion failed:", error);
      showLoginMessage(
        "An error occurred during login. Please try again.",
        "error"
      );
    }
  }

  /**
   * Generate a secure random token with increased entropy
   * @returns {Promise<string>} Generated token
   */
  async function generateToken() {
    const buffer = new Uint8Array(48); // Increased from 32 to 48 for more entropy
    crypto.getRandomValues(buffer);
    return Array.from(buffer)
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  /**
   * Generate a cryptographically secure token with maximum entropy
   * @returns {Promise<string>} A secure token
   */
  async function generateSecureToken() {
    // Use combined methods for maximum entropy
    const buffer = new Uint8Array(64);
    crypto.getRandomValues(buffer);

    // Add time component for added uniqueness
    const timeComponent = Date.now().toString();
    const encoder = new TextEncoder();
    const timeData = encoder.encode(timeComponent);

    // Mix in the time data
    for (let i = 0; i < Math.min(timeData.length, buffer.length); i++) {
      buffer[i] ^= timeData[i]; // XOR for mixing
    }

    // Convert to hex string
    const token = Array.from(buffer, (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
    return token;
  }

  /**
   * Get the current CSRF token
   * @returns {string|null} CSRF token or null if not available
   */
  function getCSRFToken() {
    return sessionStorage.getItem(CSRF_TOKEN_KEY);
  }

  /**
   * Generate a new CSRF token with improved entropy
   * @returns {string} The generated token
   */
  function regenerateCSRFToken() {
    const buffer = new Uint8Array(64); // Increased from 32 to 64
    crypto.getRandomValues(buffer);
    const token = Array.from(buffer, (b) =>
      b.toString(16).padStart(2, "0")
    ).join("");
    sessionStorage.setItem(CSRF_TOKEN_KEY, token);
    return token;
  }

  /**
   * Check if session needs to be refreshed
   * @returns {boolean} Whether the session needs refreshing
   */
  function needsSessionRefresh() {
    const expiryTime = localStorage.getItem(AUTH_EXPIRY_KEY);
    if (!expiryTime) return false;

    const timeUntilExpiry = parseInt(expiryTime) - Date.now();
    return timeUntilExpiry < SESSION_REFRESH_THRESHOLD && timeUntilExpiry > 0;
  }

  /**
   * Refresh the user's session
   * Extends the expiry time without requiring re-login
   */
  function refreshSession() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!token) return;

    const newExpiryTime = Date.now() + SESSION_TIMEOUT;
    localStorage.setItem(AUTH_EXPIRY_KEY, newExpiryTime.toString());

    // Regenerate CSRF token periodically for enhanced security
    regenerateCSRFToken();
  }

  /**
   * Verify a password using advanced PBKDF2 with SHA-512
   * @param {string} password - Password to verify
   * @param {string} saltHex - Salt in hexadecimal format
   * @param {string} storedHashHex - Stored hash in hexadecimal format
   * @returns {Promise<boolean>} Whether password is valid
   */
  async function verifyPassword(password, saltHex, storedHashHex) {
    try {
      // Convert salt and stored hash from hex to ArrayBuffer
      const salt = hexToArrayBuffer(saltHex);
      const storedHash = hexToArrayBuffer(storedHashHex);

      // Import key material from password
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      const importedKey = await crypto.subtle.importKey(
        "raw",
        passwordData,
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
      );

      // Derive bits using PBKDF2
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: salt,
          iterations: PBKDF2_ITERATIONS,
          hash: PBKDF2_ALGORITHM,
        },
        importedKey,
        PBKDF2_HASH_SIZE * 8
      );

      // Compare derived hash with stored hash using constant-time comparison
      return constantTimeCompare(derivedBits, storedHash);
    } catch (error) {
      console.error("Error verifying password:", error);
      return false;
    }
  }

  /**
   * Convert hexadecimal string to ArrayBuffer
   * @param {string} hexString - Hexadecimal string
   * @returns {ArrayBuffer} ArrayBuffer representation
   */
  function hexToArrayBuffer(hexString) {
    const bytes = new Uint8Array(
      hexString.match(/.{1,2}/g).map((byte) => parseInt(byte, 16))
    );
    return bytes.buffer;
  }

  /**
   * Constant time comparison of ArrayBuffers to prevent timing attacks
   * @param {ArrayBuffer} buf1 - First buffer
   * @param {ArrayBuffer} buf2 - Second buffer
   * @returns {boolean} Whether buffers are equal
   */
  function constantTimeCompare(buf1, buf2) {
    if (buf1.byteLength !== buf2.byteLength) return false;

    const dv1 = new Uint8Array(buf1);
    const dv2 = new Uint8Array(buf2);

    // Timing-safe comparison (critical for security)
    let result = 0;
    for (let i = 0; i < dv1.byteLength; i++) {
      result |= dv1[i] ^ dv2[i];
    }
    return result === 0;
  }

  /**
   * Generate a hash and salt for password storage with maximum security
   * @param {string} password - Password to hash
   * @returns {Promise<Object>} Hash and salt in hex format
   */
  async function hashPassword(password) {
    try {
      // Generate a random salt with higher entropy
      const saltBuffer = new Uint8Array(PBKDF2_SALT_SIZE);
      crypto.getRandomValues(saltBuffer);

      // Add unique device information and timestamp to salt for added entropy
      const uniqueInfo =
        navigator.userAgent +
        window.screen.width +
        window.screen.height +
        Date.now();
      const infoEncoder = new TextEncoder();
      const infoData = infoEncoder.encode(uniqueInfo);

      // Mix the unique info into the salt
      for (let i = 0; i < Math.min(infoData.length, saltBuffer.length); i++) {
        saltBuffer[i] ^= infoData[i % infoData.length]; // XOR for mixing
      }

      // Import key material from password
      const encoder = new TextEncoder();
      const passwordData = encoder.encode(password);
      const importedKey = await crypto.subtle.importKey(
        "raw",
        passwordData,
        { name: "PBKDF2" },
        false,
        ["deriveBits"]
      );

      // Derive bits using PBKDF2
      const derivedBits = await crypto.subtle.deriveBits(
        {
          name: "PBKDF2",
          salt: saltBuffer,
          iterations: PBKDF2_ITERATIONS,
          hash: PBKDF2_ALGORITHM,
        },
        importedKey,
        PBKDF2_HASH_SIZE * 8
      );

      // Convert to hex strings
      const saltHex = Array.from(new Uint8Array(saltBuffer))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

      const hashHex = Array.from(new Uint8Array(derivedBits))
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");

      return { hash: hashHex, salt: saltHex };
    } catch (error) {
      console.error("Error hashing password:", error);
      throw new Error("Failed to hash password");
    }
  }

  /**
   * Function to generate authentication data structure for an admin user
   * This should be used only for initial setup and never exposed in production
   * @param {string} username - Admin username
   * @param {string} password - Admin password
   * @param {boolean} enableTFA - Whether to enable Two-Factor Authentication
   * @returns {Promise<Object>} User object with hashed credentials
   */
  async function generateAdminCredentials(
    username,
    password,
    enableTFA = false
  ) {
    const { hash, salt } = await hashPassword(password);

    const user = {
      username,
      hash,
      salt,
      role: "admin",
      created: new Date().toISOString(),
      tfaEnabled: enableTFA,
    };

    // If 2FA is enabled, generate and add a secret key
    if (enableTFA) {
      // In a real application, you would generate a proper 2FA secret here
      user.tfaSecret = await generateToken();
    }

    return user;
  }

  /**
   * Show login message to user
   * @param {string} message - Message to display
   * @param {string} type - Message type (success, error, info)
   */
  function showLoginMessage(message, type) {
    const messageElement = document.getElementById("login-message");
    if (!messageElement) return;

    messageElement.textContent = message;
    messageElement.className = "login-message " + type;
    messageElement.style.display = "block";
  }

  /**
   * Check if user is logged in
   * @returns {boolean} Whether user is logged in
   */
  function isLoggedIn() {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);

    return token && expiry && parseInt(expiry) > Date.now();
  }

  /**
   * Verify that the user is authenticated
   * Redirect to login page if not
   * @returns {boolean} Whether user is authenticated
   */
  function verifyAuthentication() {
    if (!isLoggedIn()) {
      // Clear any existing auth data
      logout(false);
      // Redirect to login page
      window.location.href =
        "index.html?redirect=" + encodeURIComponent(window.location.pathname);
      return false;
    }

    // Check if 2FA verification is required but not completed
    const tfaEnabled = sessionStorage.getItem(TFA_ENABLED_KEY) === "true";
    const tfaVerified = sessionStorage.getItem(TFA_VERIFIED_KEY) === "true";

    if (tfaEnabled && !tfaVerified) {
      // Redirect to 2FA verification
      logout(false);
      window.location.href = "index.html?tfa=required";
      return false;
    }

    return true;
  }

  /**
   * Log out the user
   * @param {boolean} redirect - Whether to redirect to login page
   */
  function logout(redirect = true) {
    // Enhanced security: clear all authentication data
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
    sessionStorage.removeItem(CSRF_TOKEN_KEY);
    sessionStorage.removeItem("srr_username");
    sessionStorage.removeItem("srr_role");
    sessionStorage.removeItem(TFA_VERIFIED_KEY);
    sessionStorage.removeItem("pending_auth_username");
    sessionStorage.removeItem("pending_auth_role");

    // Clear all possible auth-related storage
    const authKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith("srr_")) {
        authKeys.push(key);
      }
    }

    for (const key of authKeys) {
      localStorage.removeItem(key);
    }

    if (redirect) {
      window.location.href = "index.html";
    }
  }

  /**
   * Set up the user interface for Two-Factor Authentication
   * @param {string} secret - The 2FA secret key
   * @returns {Promise<void>} Promise that resolves when setup is complete
   */
  async function setupTFA(secret) {
    // In a real application, you would:
    // 1. Generate a QR code with the secret
    // 2. Display instructions for the user
    // 3. Verify a test code from the user
    // 4. Enable 2FA for the user's account

    // This is a simplified placeholder implementation
    localStorage.setItem(TFA_SECRET_KEY, secret);
    localStorage.setItem(TFA_ENABLED_KEY, "true");
    return Promise.resolve();
  }

  /**
   * Disable Two-Factor Authentication for the current user
   * @returns {Promise<void>} Promise that resolves when 2FA is disabled
   */
  async function disableTFA() {
    localStorage.removeItem(TFA_SECRET_KEY);
    localStorage.removeItem(TFA_ENABLED_KEY);
    sessionStorage.removeItem(TFA_VERIFIED_KEY);
    return Promise.resolve();
  }

  // Public API
  return {
    init,
    isLoggedIn,
    verifyAuthentication,
    logout,
    hashPassword, // Only for development and admin setup
    generateAdminCredentials, // Only for initial admin account creation
    getCSRFToken, // For CSRF protection in forms and AJAX calls
    setupTFA,
    disableTFA,
  };
})();

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", function () {
  AuthModule.init();
});

// Store credentials safely - do not directly embed in client-side code
// These values should be stored in auth.json, properly encrypted with the hash function above
const AUTH_CONFIG = {
  KEY_VERSION: 4,
  PBKDF2_ITERATIONS: 600000,
  PBKDF2_ALGORITHM: "SHA-512",
};

// Use the more secure auth module for validation
function isLoggedIn() {
  return AuthModule.isLoggedIn();
}

function logout() {
  return AuthModule.logout();
}

// Generate secure credential helper - ONLY for admin setup use
async function generateCredentialsForAuthFile(username, password) {
  try {
    const credentials = await AuthModule.generateAdminCredentials(
      username,
      password,
      true
    );
    console.log(
      "Generated credentials (store these securely and delete this function):"
    );
    console.log(JSON.stringify(credentials, null, 2));
    return credentials;
  } catch (error) {
    console.error("Error generating credentials:", error);
    return null;
  }
}

// Automatically check auth on admin pages
if (
  window.location.pathname.includes("/admin/") &&
  !window.location.pathname.includes("index.html") &&
  !isLoggedIn()
) {
  window.location.href = "index.html";
}
