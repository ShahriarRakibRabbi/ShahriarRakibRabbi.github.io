/**
 * Export Module
 * Handles exporting and downloading data files
 * @author: SRR
 * @version: 1.0
 */

const ExportModule = (function () {
  // Private variables
  const GITHUB_CREDENTIALS_KEY = "github_credentials";
  const GITHUB_API_URL = "https://api.github.com";
  let isExporting = false;
  let exportQueue = [];
  let exportProgress = 0;
  let totalExports = 0;

  // Data file paths
  const dataFiles = {
    projects: "../data/projects.json",
    skills: "../data/skills.json",
    achievements: "../data/achievements.json",
    gallery: "../data/gallery.json",
    testimonials: "../data/testimonials.json",
    settings: "../data/settings.json",
  };

  /**
   * Initialize the export module
   */
  function init() {
    bindEvents();
    loadGitHubCredentials();
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    // Export data button
    document.addEventListener("click", function (e) {
      if (
        e.target.matches("#export-data-btn") ||
        e.target.closest("#export-data-btn")
      ) {
        e.preventDefault();
        handleExport();
      }
    });

    // GitHub connect button
    document.addEventListener("click", function (e) {
      if (
        e.target.matches("#test-github-connection") ||
        e.target.closest("#test-github-connection")
      ) {
        e.preventDefault();
        testGitHubConnection();
      }
    });

    // GitHub settings form submission
    const githubForm = document.getElementById("github-credentials-form");
    if (githubForm) {
      githubForm.addEventListener("submit", function (e) {
        e.preventDefault();
        saveGitHubCredentials();
      });
    }

    // Toggle password visibility
    document.addEventListener("click", function (e) {
      if (
        e.target.matches(".toggle-password") ||
        e.target.closest(".toggle-password")
      ) {
        const button = e.target.closest(".toggle-password");
        const input = button.parentNode.querySelector("input");

        if (input) {
          const type =
            input.getAttribute("type") === "password" ? "text" : "password";
          input.setAttribute("type", type);

          // Toggle icon
          const icon = button.querySelector("i");
          if (icon) {
            icon.classList.toggle("fa-eye");
            icon.classList.toggle("fa-eye-slash");
          }
        }
      }
    });
  }

  /**
   * Handle data export
   */
  function handleExport() {
    if (isExporting) {
      NotificationModule.showInfo("Export is already in progress");
      return;
    }

    const format =
      document.querySelector('input[name="export-format"]:checked')?.value ||
      "json";
    const includeAll = document.getElementById("export-all")?.checked || false;
    const includeImages =
      document.getElementById("include-images")?.checked || false;

    // Determine which content to export
    const contentToExport = [];

    if (includeAll) {
      contentToExport.push(
        "projects",
        "skills",
        "achievements",
        "gallery",
        "testimonials"
      );
    } else {
      if (document.getElementById("export-projects")?.checked)
        contentToExport.push("projects");
      if (document.getElementById("export-skills")?.checked)
        contentToExport.push("skills");
      if (document.getElementById("export-achievements")?.checked)
        contentToExport.push("achievements");
      if (document.getElementById("export-gallery")?.checked)
        contentToExport.push("gallery");
      if (document.getElementById("export-testimonials")?.checked)
        contentToExport.push("testimonials");
    }

    if (contentToExport.length === 0) {
      NotificationModule.showError(
        "Please select at least one content type to export"
      );
      return;
    }

    // Start export process
    startExport(contentToExport, format, includeImages);
  }

  /**
   * Start the export process
   * @param {Array<string>} contentTypes - Content types to export
   * @param {string} format - Export format
   * @param {boolean} includeImages - Whether to include images
   */
  function startExport(contentTypes, format, includeImages) {
    isExporting = true;
    exportQueue = [...contentTypes];
    totalExports = exportQueue.length;
    exportProgress = 0;

    // Update UI
    const exportBtn = document.getElementById("export-data-btn");
    if (exportBtn) {
      exportBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Exporting...';
      exportBtn.disabled = true;
    }

    // Process each content type
    processExportQueue(format, includeImages);
  }

  /**
   * Process the export queue
   * @param {string} format - Export format
   * @param {boolean} includeImages - Whether to include images
   */
  function processExportQueue(format, includeImages) {
    if (exportQueue.length === 0) {
      // Export complete
      finishExport();
      return;
    }

    // Get next content type
    const contentType = exportQueue.shift();

    // Update progress
    updateExportProgress();

    // Fetch data
    fetchData(contentType)
      .then((data) => {
        // Convert data if needed
        let exportData = data;

        // If requested format isn't JSON, convert it
        if (format !== "json") {
          if (format === "csv") {
            exportData = convertToCSV(data, contentType);
          } else if (format === "xml") {
            exportData = convertToXML(data, contentType);
          }
        }

        // If including images, add image paths
        if (includeImages) {
          exportData = includeImageReferences(exportData, contentType, format);
        }

        // Generate file
        const file = generateExportFile(exportData, contentType, format);

        // Download file
        downloadFile(file, `${contentType}.${format}`);

        // Process next in queue
        setTimeout(() => {
          processExportQueue(format, includeImages);
        }, 500);
      })
      .catch((error) => {
        console.error(`Export error for ${contentType}:`, error);
        NotificationModule.showError(
          `Failed to export ${contentType}: ${error.message}`
        );

        // Continue with next in queue
        processExportQueue(format, includeImages);
      });
  }

  /**
   * Update export progress
   */
  function updateExportProgress() {
    exportProgress++;
    const percentage = Math.round((exportProgress / totalExports) * 100);

    const exportBtn = document.getElementById("export-data-btn");
    if (exportBtn) {
      exportBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Exporting (${percentage}%)...`;
    }
  }

  /**
   * Finish the export process
   */
  function finishExport() {
    isExporting = false;

    const exportBtn = document.getElementById("export-data-btn");
    if (exportBtn) {
      exportBtn.innerHTML = '<i class="fas fa-check"></i> Export Complete';

      setTimeout(() => {
        exportBtn.innerHTML = '<i class="fas fa-download"></i> Export Data';
        exportBtn.disabled = false;
      }, 2000);
    }

    NotificationModule.showSuccess("Export completed successfully!");
  }

  /**
   * Fetch data for a content type
   * @param {string} contentType - The content type to fetch
   * @returns {Promise<Object>} The content data
   */
  function fetchData(contentType) {
    return new Promise((resolve, reject) => {
      const filePath = dataFiles[contentType];

      if (!filePath) {
        reject(new Error(`Unknown content type: ${contentType}`));
        return;
      }

      // Fetch data from file
      fetch(filePath)
        .then((response) => {
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return response.json();
        })
        .then((data) => {
          resolve(data);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /**
   * Convert data to CSV format
   * @param {Object} data - The data to convert
   * @param {string} contentType - The content type
   * @returns {string} CSV formatted data
   */
  function convertToCSV(data, contentType) {
    // Handle different content structures
    let items = [];

    if (Array.isArray(data)) {
      items = data;
    } else if (data[contentType] && Array.isArray(data[contentType])) {
      items = data[contentType];
    } else {
      // Just return a JSON string if we can't parse it properly
      return JSON.stringify(data);
    }

    if (items.length === 0) {
      return "";
    }

    // Get headers from first item
    const headers = Object.keys(items[0]);

    // Create CSV rows
    let csv = headers.join(",") + "\n";

    items.forEach((item) => {
      const row = headers
        .map((header) => {
          const value = item[header];
          let cell = "";

          if (value === null || value === undefined) {
            cell = "";
          } else if (typeof value === "object") {
            cell = JSON.stringify(value);
          } else {
            cell = value.toString();
          }

          // Escape quotes and wrap in quotes if contains comma or quotes
          if (cell.includes(",") || cell.includes('"')) {
            cell = `"${cell.replace(/"/g, '""')}"`;
          }

          return cell;
        })
        .join(",");

      csv += row + "\n";
    });

    return csv;
  }

  /**
   * Convert data to XML format
   * @param {Object} data - The data to convert
   * @param {string} contentType - The content type
   * @returns {string} XML formatted data
   */
  function convertToXML(data, contentType) {
    // Start XML document
    let xml = '<?xml version="1.0" encoding="UTF-8" ?>\n';

    // Create root element
    xml += `<${contentType}>\n`;

    // Handle different content structures
    let items = [];

    if (Array.isArray(data)) {
      items = data;
    } else if (data[contentType] && Array.isArray(data[contentType])) {
      items = data[contentType];
    } else {
      // Just wrap the entire object
      xml += objectToXML(data, "  ");
      xml += `</${contentType}>`;
      return xml;
    }

    // Add each item
    items.forEach((item, index) => {
      xml += `  <item id="${index}">\n`;
      xml += objectToXML(item, "    ");
      xml += "  </item>\n";
    });

    // Close root element
    xml += `</${contentType}>`;

    return xml;
  }

  /**
   * Convert an object to XML representation
   * @param {Object} obj - The object to convert
   * @param {string} indent - Indentation string
   * @returns {string} XML formatted object
   */
  function objectToXML(obj, indent) {
    let xml = "";

    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key];

        if (value === null || value === undefined) {
          xml += `${indent}<${key} />\n`;
        } else if (Array.isArray(value)) {
          xml += `${indent}<${key}>\n`;

          value.forEach((item, index) => {
            if (typeof item === "object" && item !== null) {
              xml += `${indent}  <item id="${index}">\n`;
              xml += objectToXML(item, indent + "    ");
              xml += `${indent}  </item>\n`;
            } else {
              xml += `${indent}  <item>${escapeXML(item)}</item>\n`;
            }
          });

          xml += `${indent}</${key}>\n`;
        } else if (typeof value === "object") {
          xml += `${indent}<${key}>\n`;
          xml += objectToXML(value, indent + "  ");
          xml += `${indent}</${key}>\n`;
        } else {
          xml += `${indent}<${key}>${escapeXML(value)}</${key}>\n`;
        }
      }
    }

    return xml;
  }

  /**
   * Escape special characters in XML
   * @param {*} value - The value to escape
   * @returns {string} Escaped value
   */
  function escapeXML(value) {
    const stringValue = String(value);
    return stringValue
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  }

  /**
   * Include image references in export data
   * @param {Object|string} data - The data to modify
   * @param {string} contentType - The content type
   * @param {string} format - The export format
   * @returns {Object|string} The modified data
   */
  function includeImageReferences(data, contentType, format) {
    if (format !== "json") {
      // For non-JSON formats, we'll leave as is since we've already converted
      return data;
    }

    // Clone data to avoid modifying the original
    let clonedData = JSON.parse(JSON.stringify(data));

    // Add a metadata object with image references
    let imageReferences = {
      metadata: {
        exportDate: new Date().toISOString(),
        imageBaseUrl: "../assets/images/",
        imageReferences: [],
      },
    };

    // Extract image references based on content type
    if (contentType === "projects") {
      const projects = Array.isArray(clonedData)
        ? clonedData
        : clonedData.projects || [];
      projects.forEach((project) => {
        if (project.image) {
          imageReferences.metadata.imageReferences.push({
            type: "project",
            id: project.id,
            path: project.image,
          });
        }

        // Check for screenshots
        if (project.screenshots && Array.isArray(project.screenshots)) {
          project.screenshots.forEach((screenshot) => {
            imageReferences.metadata.imageReferences.push({
              type: "project_screenshot",
              projectId: project.id,
              path: screenshot.image,
            });
          });
        }
      });
    } else if (contentType === "gallery") {
      const galleryItems = Array.isArray(clonedData)
        ? clonedData
        : clonedData.gallery || [];
      galleryItems.forEach((item) => {
        if (item.image) {
          imageReferences.metadata.imageReferences.push({
            type: "gallery",
            id: item.id,
            path: item.image,
          });
        }
      });
    } else if (contentType === "testimonials") {
      const testimonials = Array.isArray(clonedData)
        ? clonedData
        : clonedData.testimonials || [];
      testimonials.forEach((testimonial) => {
        if (testimonial.avatar) {
          imageReferences.metadata.imageReferences.push({
            type: "testimonial",
            id: testimonial.id,
            path: testimonial.avatar,
          });
        }
      });
    }

    // Merge the data with the metadata
    if (Array.isArray(clonedData)) {
      return {
        ...imageReferences,
        items: clonedData,
      };
    } else {
      return {
        ...clonedData,
        ...imageReferences,
      };
    }
  }

  /**
   * Generate an export file
   * @param {Object|string} data - The data to export
   * @param {string} contentType - The content type
   * @param {string} format - The export format
   * @returns {Blob} The file blob
   */
  function generateExportFile(data, contentType, format) {
    let fileContent = "";
    let mimeType = "";

    if (format === "json") {
      // Pretty print JSON
      fileContent = JSON.stringify(data, null, 2);
      mimeType = "application/json";
    } else if (format === "csv") {
      fileContent = data; // Already formatted as CSV
      mimeType = "text/csv";
    } else if (format === "xml") {
      fileContent = data; // Already formatted as XML
      mimeType = "application/xml";
    } else {
      // Default to JSON
      fileContent = JSON.stringify(data);
      mimeType = "application/json";
    }

    return new Blob([fileContent], { type: mimeType });
  }

  /**
   * Download a file
   * @param {Blob} file - The file to download
   * @param {string} filename - The filename
   */
  function downloadFile(file, filename) {
    const url = URL.createObjectURL(file);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    // Append to body and trigger download
    document.body.appendChild(link);
    link.click();

    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  /**
   * Save GitHub credentials
   */
  function saveGitHubCredentials() {
    const token = document.getElementById("github-token")?.value.trim();
    const username = document.getElementById("github-username")?.value.trim();
    const repo = document.getElementById("github-repo")?.value.trim();
    const branch =
      document.getElementById("github-branch")?.value.trim() || "main";

    if (!token || !username || !repo) {
      NotificationModule.showError("Please fill in all required GitHub fields");
      return;
    }

    // Save to localStorage (encrypted in a real application)
    const credentials = {
      token,
      username,
      repo,
      branch,
      lastUpdated: new Date().toISOString(),
    };

    try {
      localStorage.setItem(GITHUB_CREDENTIALS_KEY, JSON.stringify(credentials));
      NotificationModule.showSuccess("GitHub credentials saved successfully!");

      // Update UI elements
      updateGitHubUI();

      // Close modal if open
      const modal = document.querySelector(".modal-wrapper");
      if (modal) {
        const closeEvent = new Event("click");
        modal.querySelector(".modal-close")?.dispatchEvent(closeEvent);
      }
    } catch (error) {
      console.error("Error saving GitHub credentials:", error);
      NotificationModule.showError(
        `Failed to save credentials: ${error.message}`
      );
    }
  }

  /**
   * Load GitHub credentials
   */
  function loadGitHubCredentials() {
    try {
      const storedCredentials = localStorage.getItem(GITHUB_CREDENTIALS_KEY);

      if (storedCredentials) {
        const credentials = JSON.parse(storedCredentials);

        // Fill form fields if they exist
        const tokenInput = document.getElementById("github-token");
        const usernameInput = document.getElementById("github-username");
        const repoInput = document.getElementById("github-repo");
        const branchInput = document.getElementById("github-branch");

        if (tokenInput) tokenInput.value = credentials.token || "";
        if (usernameInput) usernameInput.value = credentials.username || "";
        if (repoInput) repoInput.value = credentials.repo || "";
        if (branchInput) branchInput.value = credentials.branch || "main";

        // Update UI elements
        updateGitHubUI(credentials);

        return credentials;
      }
    } catch (error) {
      console.error("Error loading GitHub credentials:", error);
    }

    return null;
  }

  /**
   * Update GitHub UI elements
   * @param {Object} credentials - The GitHub credentials
   */
  function updateGitHubUI(credentials) {
    if (!credentials) {
      credentials = loadGitHubCredentials();
    }

    if (!credentials) return;

    // Update GitHub repo display
    const repoDisplay = document.getElementById("github-repo-display");
    if (repoDisplay) {
      repoDisplay.textContent = `${credentials.username}/${credentials.repo}`;
    }
  }

  /**
   * Test GitHub connection
   */
  function testGitHubConnection() {
    const credentials = loadGitHubCredentials();

    if (!credentials) {
      NotificationModule.showError(
        "No GitHub credentials found. Please fill in all required fields."
      );
      return;
    }

    const { token, username, repo } = credentials;

    if (!token || !username || !repo) {
      NotificationModule.showError(
        "Incomplete GitHub credentials. Please fill in all required fields."
      );
      return;
    }

    // Update button state
    const testButton = document.getElementById("test-github-connection");
    const connectionStatus = document.getElementById("connection-status");

    if (testButton) {
      testButton.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Testing...';
      testButton.disabled = true;
    }

    if (connectionStatus) {
      connectionStatus.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Testing connection...';
      connectionStatus.className = "";
    }

    // Test connection to GitHub API
    fetch(`${GITHUB_API_URL}/repos/${username}/${repo}`, {
      headers: {
        Authorization: `token ${token}`,
        Accept: "application/vnd.github.v3+json",
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        // Connection successful
        if (connectionStatus) {
          connectionStatus.innerHTML =
            '<span class="text-success"><i class="fas fa-check-circle"></i> Connected successfully!</span>';
        }

        NotificationModule.showSuccess(
          `Successfully connected to ${username}/${repo}`
        );
      })
      .catch((error) => {
        // Connection failed
        console.error("GitHub connection test failed:", error);

        if (connectionStatus) {
          connectionStatus.innerHTML =
            '<span class="text-danger"><i class="fas fa-times-circle"></i> Connection failed!</span>';
        }

        NotificationModule.showError(
          `GitHub connection failed: ${error.message}`
        );
      })
      .finally(() => {
        // Reset button state
        if (testButton) {
          testButton.innerHTML = '<i class="fas fa-plug"></i> Test Connection';
          testButton.disabled = false;
        }
      });
  }

  /**
   * Commit and push changes to GitHub
   * @param {string} contentType - The content type being updated
   * @param {Object|string} data - The data to commit
   * @param {string} message - The commit message
   * @returns {Promise<Object>} The commit result
   */
  function commitToGitHub(contentType, data, message = "Update content") {
    return new Promise((resolve, reject) => {
      const credentials = loadGitHubCredentials();

      if (!credentials) {
        reject(new Error("No GitHub credentials found"));
        return;
      }

      const { token, username, repo, branch } = credentials;

      // Get the file path based on content type
      const filePath =
        contentType === "settings"
          ? "data/settings.json"
          : `data/${contentType}.json`;

      // First get the current file to get its SHA
      getFileFromGitHub(filePath)
        .then((fileInfo) => {
          // Prepare the content to be committed
          let content = "";

          if (typeof data === "string") {
            content = data;
          } else {
            content = JSON.stringify(data, null, 2);
          }

          // Base64 encode the content
          const encodedContent = btoa(unescape(encodeURIComponent(content)));

          // Prepare the request body
          const body = {
            message,
            content: encodedContent,
            branch: branch || "main",
          };

          // If we have a SHA, include it to update the file
          if (fileInfo && fileInfo.sha) {
            body.sha = fileInfo.sha;
          }

          // Commit the file
          return fetch(
            `${GITHUB_API_URL}/repos/${username}/${repo}/contents/${filePath}`,
            {
              method: "PUT",
              headers: {
                Authorization: `token ${token}`,
                "Content-Type": "application/json",
                Accept: "application/vnd.github.v3+json",
              },
              body: JSON.stringify(body),
            }
          );
        })
        .then((response) => {
          if (!response.ok) {
            return response.json().then((data) => {
              throw new Error(
                data.message || `GitHub API error: ${response.status}`
              );
            });
          }
          return response.json();
        })
        .then((data) => {
          // Successfully committed
          resolve(data);
        })
        .catch((error) => {
          console.error("GitHub commit error:", error);
          reject(error);
        });
    });
  }

  /**
   * Get a file from GitHub
   * @param {string} filePath - The file path in the repo
   * @returns {Promise<Object>} File information including SHA
   */
  function getFileFromGitHub(filePath) {
    return new Promise((resolve, reject) => {
      const credentials = loadGitHubCredentials();

      if (!credentials) {
        reject(new Error("No GitHub credentials found"));
        return;
      }

      const { token, username, repo, branch } = credentials;

      fetch(
        `${GITHUB_API_URL}/repos/${username}/${repo}/contents/${filePath}?ref=${
          branch || "main"
        }`,
        {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
          },
        }
      )
        .then((response) => {
          if (response.status === 404) {
            // File doesn't exist yet, which is fine
            resolve(null);
            return;
          }

          if (!response.ok) {
            return response.json().then((data) => {
              throw new Error(
                data.message || `GitHub API error: ${response.status}`
              );
            });
          }

          return response.json();
        })
        .then((data) => {
          if (data) {
            resolve({
              sha: data.sha,
              path: data.path,
              size: data.size,
              url: data.html_url,
            });
          } else {
            resolve(null);
          }
        })
        .catch((error) => {
          console.error("Error fetching file from GitHub:", error);
          reject(error);
        });
    });
  }

  /**
   * Upload an image to GitHub
   * @param {File|Blob|string} image - The image file or base64 data
   * @param {string} fileName - The file name
   * @param {string} contentType - The content type (projects, gallery, etc.)
   * @param {Function} progressCallback - Callback for upload progress
   * @returns {Promise<string>} The URL of the uploaded image
   */
  function uploadImageToGitHub(image, fileName, contentType, progressCallback) {
    return new Promise((resolve, reject) => {
      const credentials = loadGitHubCredentials();

      if (!credentials) {
        reject(new Error("No GitHub credentials found"));
        return;
      }

      // Determine the folder path based on content type
      let folderPath = `assets/images/${contentType}/`;

      // Process the image
      processImageForUpload(image)
        .then(({ base64Data, extension }) => {
          // Generate a more unique filename if needed
          if (!fileName.includes(".")) {
            fileName = `${fileName}.${extension}`;
          }

          // Full path in the repo
          const fullPath = `${folderPath}${fileName}`;

          // Simulate progress for now (in a real app we might use XHR for progress)
          if (progressCallback) {
            let progress = 0;
            const interval = setInterval(() => {
              progress += 10;
              if (progress <= 90) {
                progressCallback(progress);
              }

              if (progress > 90) {
                clearInterval(interval);
              }
            }, 300);
          }

          // First check if file already exists
          return getFileFromGitHub(fullPath)
            .then((fileInfo) => {
              // Prepare the request body
              const body = {
                message: `Upload ${contentType} image: ${fileName}`,
                content: base64Data,
                branch: credentials.branch || "main",
              };

              // If file exists, include its SHA
              if (fileInfo && fileInfo.sha) {
                body.sha = fileInfo.sha;
              }

              // Commit the file
              return fetch(
                `${GITHUB_API_URL}/repos/${credentials.username}/${credentials.repo}/contents/${fullPath}`,
                {
                  method: "PUT",
                  headers: {
                    Authorization: `token ${credentials.token}`,
                    "Content-Type": "application/json",
                    Accept: "application/vnd.github.v3+json",
                  },
                  body: JSON.stringify(body),
                }
              );
            })
            .then((response) => {
              if (!response.ok) {
                return response.json().then((data) => {
                  throw new Error(
                    data.message || `GitHub API error: ${response.status}`
                  );
                });
              }
              return response.json();
            })
            .then((data) => {
              // Complete progress
              if (progressCallback) {
                progressCallback(100);
              }

              // Return the path to use in content
              resolve(fullPath);
            });
        })
        .catch((error) => {
          console.error("Image upload error:", error);
          reject(error);
        });
    });
  }

  /**
   * Process an image for upload
   * @param {File|Blob|string} image - The image to process
   * @returns {Promise<Object>} Object with base64 data and extension
   */
  function processImageForUpload(image) {
    return new Promise((resolve, reject) => {
      // If image is already a base64 string
      if (typeof image === "string" && image.startsWith("data:image/")) {
        const matches = image.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);

        if (matches && matches.length === 3) {
          const extension = matches[1];
          const base64Data = matches[2];

          resolve({
            base64Data,
            extension,
          });
          return;
        } else {
          reject(new Error("Invalid base64 image data"));
          return;
        }
      }

      // If image is a File or Blob
      const reader = new FileReader();

      reader.onload = function (event) {
        try {
          const base64Full = event.target.result;
          const matches = base64Full.match(
            /^data:image\/([a-zA-Z0-9]+);base64,(.+)$/
          );

          if (matches && matches.length === 3) {
            const extension = matches[1];
            const base64Data = matches[2];

            resolve({
              base64Data,
              extension,
            });
          } else {
            reject(new Error("Invalid image format"));
          }
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = function (error) {
        reject(error);
      };

      reader.readAsDataURL(image);
    });
  }

  // Public API
  return {
    init,
    exportData: handleExport,
    commitToGitHub,
    uploadImageToGitHub,
    testGitHubConnection,
    getGitHubCredentials: loadGitHubCredentials,
  };
})();

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", ExportModule.init);
