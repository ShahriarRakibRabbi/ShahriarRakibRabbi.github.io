/**
 * Achievements Module
 * Handles loading and displaying achievements
 * @author: SRR
 * @version: 1.0
 */

document.addEventListener("DOMContentLoaded", function () {
  // DOM Elements
  const timeline = document.getElementById("achievements-timeline");
  const filterButtons = document.querySelectorAll(".projects-filter__btn");
  const searchInput = document.getElementById("achievement-search");
  const sortSelect = document.getElementById("achievements-sort");
  const resetFiltersBtn = document.getElementById("reset-filters");
  const clearFiltersBtn = document.getElementById("clear-filters");
  const loadingEl = document.getElementById("achievements-loading");
  const errorEl = document.getElementById("achievements-error");
  const noResultsEl = document.getElementById("no-results");
  const retryBtn = document.getElementById("retry-achievements-btn");

  // Stats Elements
  const totalAchievementsEl = document.getElementById("total-achievements");
  const totalCertificatesEl = document.getElementById("total-certificates");
  const totalAwardsEl = document.getElementById("total-awards");
  const totalEducationEl = document.getElementById("total-education");

  // State
  let achievements = [];
  let filteredAchievements = [];
  let currentFilter = "all";
  let currentSort = "newest";
  let searchQuery = "";

  /**
   * Initialize the achievements page
   */
  function init() {
    loadAchievements();
    bindEvents();
  }

  /**
   * Load achievements data from JSON
   */
  function loadAchievements() {
    showLoading();

    fetch("data/achievements.json")
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        achievements = data || [];
        filteredAchievements = [...achievements];
        updateStats();
        applyFiltersAndSort();
        hideLoading();
      })
      .catch((error) => {
        console.error("Error loading achievements:", error);
        showError();
      });
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    // Filter buttons
    filterButtons.forEach((button) => {
      button.addEventListener("click", function () {
        filterButtons.forEach((btn) => btn.classList.remove("active"));
        this.classList.add("active");
        currentFilter = this.dataset.filter;
        applyFiltersAndSort();
      });
    });

    // Search input
    searchInput.addEventListener(
      "input",
      debounce(function () {
        searchQuery = this.value.trim().toLowerCase();
        applyFiltersAndSort();
      }, 300)
    );

    // Sort select
    sortSelect.addEventListener("change", function () {
      currentSort = this.value;
      applyFiltersAndSort();
    });

    // Reset filters
    resetFiltersBtn.addEventListener("click", resetFilters);
    clearFiltersBtn.addEventListener("click", resetFilters);

    // Retry button
    retryBtn.addEventListener("click", loadAchievements);

    // Back to top button
    const backToTopBtn = document.getElementById("back-to-top");
    if (backToTopBtn) {
      window.addEventListener("scroll", function () {
        if (window.pageYOffset > 300) {
          backToTopBtn.classList.add("show");
        } else {
          backToTopBtn.classList.remove("show");
        }
      });

      backToTopBtn.addEventListener("click", function () {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      });
    }
  }

  /**
   * Apply current filters and sort to achievements
   */
  function applyFiltersAndSort() {
    // Filter by category
    filteredAchievements = achievements.filter((achievement) => {
      // Category filter
      const passesFilter =
        currentFilter === "all" || achievement.category === currentFilter;

      // Search query
      const matchesSearch =
        searchQuery === "" ||
        achievement.title.toLowerCase().includes(searchQuery) ||
        (achievement.description &&
          achievement.description.toLowerCase().includes(searchQuery));

      return passesFilter && matchesSearch;
    });

    // Sort achievements
    sortAchievements();

    // Render to DOM
    renderAchievements();
  }

  /**
   * Sort achievements based on current sort option
   */
  function sortAchievements() {
    filteredAchievements.sort((a, b) => {
      switch (currentSort) {
        case "newest":
          return (
            new Date(b.date || "2000-01-01") - new Date(a.date || "2000-01-01")
          );
        case "oldest":
          return (
            new Date(a.date || "2000-01-01") - new Date(b.date || "2000-01-01")
          );
        case "name-asc":
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });
  }

  /**
   * Render achievements to the timeline
   */
  function renderAchievements() {
    if (!timeline) return;

    timeline.innerHTML = "";

    if (filteredAchievements.length === 0) {
      noResultsEl.style.display = "flex";
      return;
    }

    noResultsEl.style.display = "none";

    // Group achievements by year for the timeline
    const achievementsByYear = {};

    filteredAchievements.forEach((achievement) => {
      const date = new Date(achievement.date || "2000-01-01");
      const year = date.getFullYear();

      if (!achievementsByYear[year]) {
        achievementsByYear[year] = [];
      }

      achievementsByYear[year].push(achievement);
    });

    // Sort years in descending order
    const sortedYears = Object.keys(achievementsByYear).sort((a, b) => b - a);

    // Create a timeline item for each year
    sortedYears.forEach((year) => {
      const yearItems = achievementsByYear[year];

      const timelineItem = document.createElement("div");
      timelineItem.className = "timeline-item";

      const timelineYear = document.createElement("div");
      timelineYear.className = "timeline-year";
      timelineYear.textContent = year;

      const timelineContent = document.createElement("div");
      timelineContent.className = "timeline-content";

      // Add each achievement in this year
      yearItems.forEach((achievement) => {
        const achievementCard = createAchievementCard(achievement);
        timelineContent.appendChild(achievementCard);
      });

      timelineItem.appendChild(timelineYear);
      timelineItem.appendChild(timelineContent);
      timeline.appendChild(timelineItem);
    });
  }

  /**
   * Create an achievement card element
   * @param {Object} achievement - Achievement data object
   * @returns {HTMLElement} Achievement card element
   */
  function createAchievementCard(achievement) {
    const card = document.createElement("div");
    card.className = "achievement-card";
    card.dataset.category = achievement.category || "other";

    const icon = document.createElement("div");
    icon.className = "achievement-icon";
    icon.innerHTML = `<i class="${achievement.icon || "fas fa-trophy"}"></i>`;

    const content = document.createElement("div");
    content.className = "achievement-content";

    // Format the date
    let dateDisplay = "";
    if (achievement.date) {
      const date = new Date(achievement.date);
      const options = { year: "numeric", month: "long" };
      dateDisplay = date.toLocaleDateString("en-US", options);
    }

    content.innerHTML = `
            <div class="achievement-date">${dateDisplay}</div>
            <h3 class="achievement-title">${achievement.title}</h3>
            ${
              achievement.description
                ? `<p class="achievement-description">${achievement.description}</p>`
                : ""
            }
            ${
              achievement.link
                ? `<a href="${achievement.link}" class="achievement-link" target="_blank">Learn more <i class="fas fa-external-link-alt"></i></a>`
                : ""
            }
            <div class="achievement-tags">
                <span class="achievement-tag">${formatCategory(
                  achievement.category
                )}</span>
            </div>
        `;

    card.appendChild(icon);
    card.appendChild(content);

    return card;
  }

  /**
   * Format category for display
   * @param {string} category - Category identifier
   * @returns {string} Formatted category name
   */
  function formatCategory(category) {
    switch (category) {
      case "education":
        return "Education";
      case "certificate":
        return "Certification";
      case "award":
        return "Award";
      case "professional":
        return "Professional";
      default:
        return "Other";
    }
  }

  /**
   * Reset all filters and sort to default
   */
  function resetFilters() {
    // Reset filter buttons
    filterButtons.forEach((btn) => {
      btn.classList.remove("active");
      if (btn.dataset.filter === "all") {
        btn.classList.add("active");
      }
    });

    // Reset search and sort
    searchInput.value = "";
    sortSelect.value = "newest";

    // Reset state
    currentFilter = "all";
    currentSort = "newest";
    searchQuery = "";

    // Apply changes
    applyFiltersAndSort();
  }

  /**
   * Update achievement statistics
   */
  function updateStats() {
    if (totalAchievementsEl) {
      totalAchievementsEl.textContent = achievements.length;
    }

    if (totalCertificatesEl) {
      const certificates = achievements.filter(
        (a) => a.category === "certificate"
      ).length;
      totalCertificatesEl.textContent = certificates;
    }

    if (totalAwardsEl) {
      const awards = achievements.filter((a) => a.category === "award").length;
      totalAwardsEl.textContent = awards;
    }

    if (totalEducationEl) {
      const education = achievements.filter(
        (a) => a.category === "education"
      ).length;
      totalEducationEl.textContent = education;
    }
  }

  /**
   * Show loading state
   */
  function showLoading() {
    if (loadingEl) loadingEl.style.display = "flex";
    if (errorEl) errorEl.style.display = "none";
    if (timeline) timeline.style.display = "none";
  }

  /**
   * Hide loading state
   */
  function hideLoading() {
    if (loadingEl) loadingEl.style.display = "none";
    if (timeline) timeline.style.display = "block";
  }

  /**
   * Show error state
   */
  function showError() {
    if (loadingEl) loadingEl.style.display = "none";
    if (errorEl) errorEl.style.display = "flex";
    if (timeline) timeline.style.display = "none";
  }

  /**
   * Debounce function to limit how often a function is called
   * @param {Function} func - Function to debounce
   * @param {number} delay - Delay in milliseconds
   * @returns {Function} Debounced function
   */
  function debounce(func, delay) {
    let timeoutId;
    return function () {
      const context = this;
      const args = arguments;
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(context, args);
      }, delay);
    };
  }

  // Initialize
  init();
});
