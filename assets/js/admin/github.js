/**
 * GitHub Integration Module
 * Handles GitHub API interactions and repository management
 * @author: SRR
 * @version: 2.0
 */

const GitHubModule = (function () {
  // GitHub API configuration
  const API_BASE = "https://api.github.com";
  const REQUIRED_SCOPES = ["repo"];

  /**
   * Initialize GitHub integration
   */
  async function init() {
    loadStoredCredentials();
    await validateToken();
  }

  /**
   * Save changes and push to GitHub
   * @param {Object} changes - Changed files and their content
   */
  async function pushChanges(changes) {
    try {
      const credentials = loadStoredCredentials();
      if (!credentials) throw new Error("GitHub credentials not found");

      for (const [file, content] of Object.entries(changes)) {
        await commitFile(file, content, `Update ${file}`);
      }

      NotificationModule.showSuccess("Changes pushed to GitHub successfully");
    } catch (error) {
      NotificationModule.showError(`GitHub push failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Load stored GitHub credentials
   */
  function loadStoredCredentials() {
    const credentials = {
      token: localStorage.getItem("github_token"),
      username: localStorage.getItem("github_username"),
      repo: localStorage.getItem("github_repo"),
      branch: localStorage.getItem("github_branch") || "main",
    };

    if (!credentials.token || !credentials.username || !credentials.repo) {
      return null;
    }

    return credentials;
  }

  return {
    init,
    pushChanges,
  };
})();
