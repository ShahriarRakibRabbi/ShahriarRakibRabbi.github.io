/**
 * Data Loader Utility
 * Handles loading and saving data from JSON files for the portfolio website
 */

/**
 * Load data from a JSON file
 * @param {string} url - URL of the JSON file
 * @returns {Promise} - Promise that resolves with the data
 */
function loadData(url) {
    return new Promise((resolve, reject) => {
        // First try to get from localStorage cache if available
        const cacheKey = `cache_${url}`;
        const cachedData = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(`${cacheKey}_time`);
        
        // Check if we have valid cached data less than 5 minutes old
        const now = new Date().getTime();
        if (cachedData && cachedTime && (now - parseInt(cachedTime) < 300000)) {
            try {
                const data = JSON.parse(cachedData);
                console.log(`Loaded ${url} from cache`);
                resolve(data);
                
                // Still fetch in background to update cache silently
                fetchAndUpdateCache(url);
                return;
            } catch (e) {
                console.warn('Cache parsing failed, fetching fresh data');
            }
        }
        
        // If no cache or cache is invalid, fetch fresh data
        fetchAndUpdateCache(url)
            .then(data => resolve(data))
            .catch(err => reject(err));
    });
}

/**
 * Fetch data from URL and update cache
 * @param {string} url - URL to fetch from
 * @returns {Promise} - Promise that resolves with the data
 */
function fetchAndUpdateCache(url) {
    return new Promise((resolve, reject) => {
        fetch(url)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                // Cache the data and timestamp
                const cacheKey = `cache_${url}`;
                localStorage.setItem(cacheKey, JSON.stringify(data));
                localStorage.setItem(`${cacheKey}_time`, new Date().getTime().toString());
                resolve(data);
            })
            .catch(err => {
                console.error('Fetch error:', err);
                
                // If fetch fails, try to use any cached data as fallback even if old
                const cachedData = localStorage.getItem(`cache_${url}`);
                if (cachedData) {
                    try {
                        const data = JSON.parse(cachedData);
                        console.warn(`Using outdated cache for ${url} due to fetch error`);
                        resolve(data);
                    } catch (e) {
                        reject(err);
                    }
                } else {
                    reject(err);
                }
            });
    });
}

/**
 * Save data to a JSON file via admin API endpoint
 * @param {string} url - URL of the JSON file
 * @param {Object} data - Data to save
 * @returns {Promise} - Promise that resolves when data is saved
 */
function saveData(url, data) {
    return new Promise((resolve, reject) => {
        // In a real scenario this would use a proper API
        // For this demo, we'll save to localStorage as if it were saved to server
        try {
            const cacheKey = `cache_${url}`;
            localStorage.setItem(cacheKey, JSON.stringify(data));
            localStorage.setItem(`${cacheKey}_time`, new Date().getTime().toString());
            
            // Simulate network delay
            setTimeout(() => {
                resolve({ success: true, message: 'Data saved successfully' });
            }, 500);
        } catch (err) {
            reject({ success: false, message: 'Failed to save data', error: err });
        }
    });
}

/**
 * Export data to a downloadable file
 * @param {string} url - URL of the JSON file to export
 * @param {string} filename - Name of the file to download
 */
function exportData(url, filename) {
    loadData(url)
        .then(data => {
            const dataStr = JSON.stringify(data, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const downloadUrl = URL.createObjectURL(dataBlob);
            
            const downloadLink = document.createElement('a');
            downloadLink.href = downloadUrl;
            downloadLink.download = filename;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // Clean up the URL object
            setTimeout(() => URL.revokeObjectURL(downloadUrl), 100);
        })
        .catch(err => {
            console.error('Export error:', err);
            alert('Failed to export data. Please try again.');
        });
}

/**
 * Import data from a file
 * @param {File} file - File to import
 * @param {string} url - URL to save the imported data to
 * @returns {Promise} - Promise that resolves when data is imported
 */
function importData(file, url) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                // Save the imported data
                saveData(url, data)
                    .then(() => {
                        resolve({ success: true, message: 'Data imported successfully', data });
                    })
                    .catch(err => reject(err));
            } catch (err) {
                reject({ success: false, message: 'Invalid JSON file', error: err });
            }
        };
        
        reader.onerror = function() {
            reject({ success: false, message: 'Failed to read file' });
        };
        
        reader.readAsText(file);
    });
}

/**
 * Load multiple data files and combine them
 * @param {Array<string>} urls - Array of URLs to load
 * @returns {Promise} - Promise that resolves with an object containing all data
 */
function loadMultipleData(urls) {
    const promises = urls.map(url => {
        // Extract a key name from the URL (e.g., 'projects' from 'data/projects.json')
        const key = url.split('/').pop().replace('.json', '');
        return loadData(url).then(data => ({ key, data }));
    });
    
    return Promise.all(promises)
        .then(results => {
            // Combine all results into a single object
            return results.reduce((acc, { key, data }) => {
                acc[key] = data;
                return acc;
            }, {});
        });
}

/**
 * Clear all cached data
 */
function clearCache() {
    // Find all cache keys
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('cache_')) {
            keysToRemove.push(key);
        }
    }
    
    // Remove all cache keys
    keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        localStorage.removeItem(`${key}_time`);
    });
    
    console.log('Cache cleared:', keysToRemove.length, 'items removed');
    return keysToRemove.length;
}

/**
 * Get the time when data was last updated
 * @param {string} url - URL of the JSON file
 * @returns {Date|null} - Date object or null if no data
 */
function getLastUpdated(url) {
    const timeStr = localStorage.getItem(`cache_${url}_time`);
    return timeStr ? new Date(parseInt(timeStr)) : null;
}

/**
 * Check if data needs refresh (older than specified time)
 * @param {string} url - URL of the JSON file
 * @param {number} maxAge - Maximum age in milliseconds
 * @returns {boolean} - True if data needs refresh
 */
function needsRefresh(url, maxAge) {
    const lastUpdated = getLastUpdated(url);
    if (!lastUpdated) return true;
    
    const now = new Date();
    const age = now.getTime() - lastUpdated.getTime();
    return age > maxAge;
}

/**
 * Reload all data from server, bypassing cache
 */
function forceRefreshData() {
    // Find all cache keys
    const cacheUrls = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('cache_') && !key.endsWith('_time')) {
            cacheUrls.push(key.replace('cache_', ''));
        }
    }
    
    // Clear cache first
    clearCache();
    
    // Reload each file
    const promises = cacheUrls.map(url => fetchAndUpdateCache(url));
    
    return Promise.all(promises)
        .then(() => {
            console.log('All data refreshed successfully');
            return true;
        })
        .catch(err => {
            console.error('Failed to refresh all data:', err);
            return false;
        });
}