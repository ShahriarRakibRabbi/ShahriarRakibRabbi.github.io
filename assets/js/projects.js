/**
 * Projects Module
 * Handles project filtering, sorting, and display
 * @author: SRR
 * @version: 1.0
 */

/**
 * Projects page functionality
 * Handles loading, filtering, sorting, and displaying projects
 */

// Global variables
let allProjects = [];
let currentProjects = [];
let currentFilter = "all";
let currentSort = "newest";
let currentSearch = "";
let currentPage = 1;
const projectsPerPage = 9;

// DOM Elements
const projectsGrid = document.getElementById("projects-full-grid");
const featuredProjectContainer = document.getElementById("featured-project");
const technologiesCloud = document.getElementById("technologies-cloud");
const projectsPagination = document.getElementById("projects-pagination");
const noResultsContainer = document.getElementById("no-results");
const resetFiltersBtn = document.getElementById("reset-filters");
const projectSearchInput = document.getElementById("project-search");
const projectsSortSelect = document.getElementById("projects-sort");
const filterButtons = document.querySelectorAll(".projects-filter__btn");
const searchButton = document.querySelector(".search-btn");
const totalProjectsEl = document.getElementById("total-projects");
const totalTechnologiesEl = document.getElementById("total-technologies");
const yearsExperienceEl = document.getElementById("years-experience");
const backToTopButton = document.getElementById("back-to-top");

/**
 * Initialize the projects page
 */
function init() {
  loadProjects();
  setupEventListeners();
  setupBackToTop();
}

/**
 * Load projects from JSON file
 */
async function loadProjects() {
  try {
    showLoading();

    // Fetch projects data
    const response = await fetch("assets/data/projects.json");
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    allProjects = await response.json();
    currentProjects = [...allProjects];

    // Initialize the page
    displayFeaturedProject();
    updateStats();
    generateTechCloud();
    applyFiltersAndSort();

    hideLoading();
  } catch (error) {
    console.error("Error loading projects:", error);
    showError("Failed to load projects. Please try again later.");
  }
}

/**
 * Display featured project
 */
function displayFeaturedProject() {
  const featuredProject = allProjects.find((project) => project.featured);

  if (!featuredProject || !featuredProjectContainer) return;

  const technologies = featuredProject.technologies
    .map((tech) => `<span class="tag">${tech}</span>`)
    .join("");

  const html = `
        <div class="featured-project-media">
            <img src="${featuredProject.image}" alt="${featuredProject.title}">
        </div>
        <div class="featured-project-info">
            <h3>${featuredProject.title}</h3>
            <p class="featured-project-description">${
              featuredProject.longDescription || featuredProject.description
            }</p>
            <div class="featured-project-tags">
                ${technologies}
            </div>
            <div class="featured-project-links">
                ${
                  featuredProject.liveUrl
                    ? `<a href="${featuredProject.liveUrl}" class="btn--primary" target="_blank">View Live</a>`
                    : ""
                }
                ${
                  featuredProject.githubUrl
                    ? `<a href="${featuredProject.githubUrl}" class="btn--secondary" target="_blank">View Code</a>`
                    : ""
                }
            </div>
        </div>
    `;

  featuredProjectContainer.innerHTML = html;
}

/**
 * Apply filters, search, and sort to projects
 */
function applyFiltersAndSort() {
  // Apply filter
  let filteredProjects = allProjects;
  if (currentFilter !== "all") {
    filteredProjects = allProjects.filter(
      (project) => project.category === currentFilter
    );
  }

  // Apply search
  if (currentSearch.trim() !== "") {
    const searchTerm = currentSearch.toLowerCase().trim();
    filteredProjects = filteredProjects.filter((project) => {
      return (
        project.title.toLowerCase().includes(searchTerm) ||
        project.description.toLowerCase().includes(searchTerm) ||
        (project.longDescription &&
          project.longDescription.toLowerCase().includes(searchTerm)) ||
        project.technologies.some((tech) =>
          tech.toLowerCase().includes(searchTerm)
        ) ||
        (project.category &&
          project.category.toLowerCase().includes(searchTerm))
      );
    });
  }

  // Apply sort
  switch (currentSort) {
    case "newest":
      filteredProjects.sort((a, b) => new Date(b.date) - new Date(a.date));
      break;
    case "oldest":
      filteredProjects.sort((a, b) => new Date(a.date) - new Date(b.date));
      break;
    case "name-asc":
      filteredProjects.sort((a, b) => a.title.localeCompare(b.title));
      break;
    case "name-desc":
      filteredProjects.sort((a, b) => b.title.localeCompare(a.title));
      break;
  }

  currentProjects = filteredProjects;
  currentPage = 1; // Reset to first page when filtering/searching

  // Display projects and update pagination
  displayProjects();
}

/**
 * Display projects in the grid
 */
function displayProjects() {
  if (!projectsGrid) return;

  // Show/hide no results message
  if (currentProjects.length === 0) {
    projectsGrid.innerHTML = "";
    noResultsContainer.style.display = "flex";
    projectsPagination.innerHTML = "";
    return;
  }

  noResultsContainer.style.display = "none";

  // Calculate pagination
  const totalPages = Math.ceil(currentProjects.length / projectsPerPage);
  const startIndex = (currentPage - 1) * projectsPerPage;
  const endIndex = Math.min(
    startIndex + projectsPerPage,
    currentProjects.length
  );

  const projectsToShow = currentProjects.slice(startIndex, endIndex);

  // Generate HTML for projects
  const projectsHTML = projectsToShow
    .map((project) => {
      const technologies = project.technologies
        .slice(0, 4)
        .map((tech) => `<span class="project-tag">${tech}</span>`)
        .join("");

      const extraTechCount =
        project.technologies.length > 4
          ? `<span class="project-tag">+${
              project.technologies.length - 4
            }</span>`
          : "";

      return `
            <div class="project-card" data-category="${project.category}">
                <div class="project-image">
                    <img src="${project.image}" alt="${project.title}">
                    <div class="project-category">${getCategoryLabel(
                      project.category
                    )}</div>
                </div>
                <div class="project-info">
                    <h3 class="project-title">${project.title}</h3>
                    <p class="project-description">${project.description}</p>
                    <div class="project-tags">
                        ${technologies}
                        ${extraTechCount}
                    </div>
                    <div class="project-links">
                        ${
                          project.liveUrl
                            ? `<a href="${project.liveUrl}" class="btn--primary" target="_blank">View Live</a>`
                            : ""
                        }
                        ${
                          project.githubUrl
                            ? `<a href="${project.githubUrl}" class="btn--secondary" target="_blank">View Code</a>`
                            : ""
                        }
                    </div>
                </div>
            </div>
        `;
    })
    .join("");

  projectsGrid.innerHTML = projectsHTML;

  // Generate pagination
  generatePagination(totalPages);
}

/**
 * Get human-readable category label
 */
function getCategoryLabel(category) {
  switch (category) {
    case "webapp":
      return "Web App";
    case "aiml":
      return "AI/ML";
    case "mobile":
      return "Mobile App";
    case "desktop":
      return "Desktop App";
    default:
      return category;
  }
}

/**
 * Generate pagination UI
 */
function generatePagination(totalPages) {
  if (!projectsPagination || totalPages <= 1) {
    if (projectsPagination) projectsPagination.innerHTML = "";
    return;
  }

  let paginationHTML = "";

  // Previous button
  paginationHTML += `
        <button class="pagination-button prev ${
          currentPage === 1 ? "disabled" : ""
        }" 
                ${currentPage === 1 ? "disabled" : ""}
                aria-label="Previous page">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;

  // Page numbers
  const maxVisiblePages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2));
  let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

  // Adjust start page if needed
  if (endPage - startPage + 1 < maxVisiblePages) {
    startPage = Math.max(1, endPage - maxVisiblePages + 1);
  }

  // First page if not visible
  if (startPage > 1) {
    paginationHTML += `
            <button class="pagination-button" data-page="1" aria-label="Go to page 1">1</button>
            ${
              startPage > 2
                ? '<span class="pagination-ellipsis">...</span>'
                : ""
            }
        `;
  }

  // Page numbers
  for (let i = startPage; i <= endPage; i++) {
    paginationHTML += `
            <button class="pagination-button ${
              i === currentPage ? "active" : ""
            }" 
                    data-page="${i}" aria-label="Go to page ${i}">
                ${i}
            </button>
        `;
  }

  // Last page if not visible
  if (endPage < totalPages) {
    paginationHTML += `
            ${
              endPage < totalPages - 1
                ? '<span class="pagination-ellipsis">...</span>'
                : ""
            }
            <button class="pagination-button" data-page="${totalPages}" 
                    aria-label="Go to page ${totalPages}">${totalPages}</button>
        `;
  }

  // Next button
  paginationHTML += `
        <button class="pagination-button next ${
          currentPage === totalPages ? "disabled" : ""
        }" 
                ${currentPage === totalPages ? "disabled" : ""}
                aria-label="Next page">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;

  projectsPagination.innerHTML = paginationHTML;

  // Add event listeners for pagination buttons
  const pageButtons = projectsPagination.querySelectorAll(".pagination-button");
  pageButtons.forEach((button) => {
    button.addEventListener("click", handlePaginationClick);
  });
}

/**
 * Handle pagination button clicks
 */
function handlePaginationClick(e) {
  const button = e.currentTarget;

  if (button.classList.contains("disabled")) {
    return;
  }

  if (button.classList.contains("prev")) {
    currentPage--;
  } else if (button.classList.contains("next")) {
    currentPage++;
  } else {
    currentPage = parseInt(button.dataset.page);
  }

  // Scroll to top of projects section
  const projectsSection = document.querySelector(".projects-page");
  projectsSection.scrollIntoView({ behavior: "smooth" });

  displayProjects();
}

/**
 * Generate technology cloud
 */
function generateTechCloud() {
  if (!technologiesCloud) return;

  // Get all unique technologies
  const techMap = new Map();

  allProjects.forEach((project) => {
    project.technologies.forEach((tech) => {
      if (techMap.has(tech)) {
        techMap.set(tech, techMap.get(tech) + 1);
      } else {
        techMap.set(tech, 1);
      }
    });
  });

  // Convert to array and sort by frequency
  const techArray = Array.from(techMap.entries()).sort((a, b) => b[1] - a[1]);

  // Assign size classes based on frequency
  const html = techArray
    .map(([tech, count]) => {
      let sizeClass = "size-sm";

      if (count >= 5) {
        sizeClass = "size-xl";
      } else if (count >= 3) {
        sizeClass = "size-lg";
      } else if (count >= 2) {
        sizeClass = "size-md";
      }

      return `<span class="tech-tag ${sizeClass}" data-count="${count}">${tech}</span>`;
    })
    .join("");

  technologiesCloud.innerHTML = html;
}

/**
 * Update stats section
 */
function updateStats() {
  if (totalProjectsEl) {
    totalProjectsEl.textContent = allProjects.length;
  }

  if (totalTechnologiesEl) {
    const uniqueTechnologies = new Set();
    allProjects.forEach((project) => {
      project.technologies.forEach((tech) => uniqueTechnologies.add(tech));
    });
    totalTechnologiesEl.textContent = uniqueTechnologies.size;
  }

  if (yearsExperienceEl) {
    // Calculate years from the earliest project date to now
    const dates = allProjects.map((project) => new Date(project.date));
    const earliestDate = new Date(Math.min(...dates));
    const currentDate = new Date();
    const years = currentDate.getFullYear() - earliestDate.getFullYear();
    yearsExperienceEl.textContent = years;
  }
}

/**
 * Set up event listeners
 */
function setupEventListeners() {
  // Filter buttons
  filterButtons.forEach((button) => {
    button.addEventListener("click", () => {
      // Remove active class from all buttons
      filterButtons.forEach((btn) => btn.classList.remove("active"));

      // Add active class to clicked button
      button.classList.add("active");

      // Update current filter and apply
      currentFilter = button.getAttribute("data-filter");
      applyFiltersAndSort();
    });
  });

  // Search input
  if (projectSearchInput) {
    projectSearchInput.addEventListener("input", (e) => {
      currentSearch = e.target.value;
      // Debounce the search for better performance
      clearTimeout(projectSearchInput.searchTimer);
      projectSearchInput.searchTimer = setTimeout(() => {
        applyFiltersAndSort();
      }, 300);
    });
  }

  // Search button
  if (searchButton) {
    searchButton.addEventListener("click", () => {
      currentSearch = projectSearchInput.value;
      applyFiltersAndSort();
    });
  }

  // Sort select
  if (projectsSortSelect) {
    projectsSortSelect.addEventListener("change", (e) => {
      currentSort = e.target.value;
      applyFiltersAndSort();
    });
  }

  // Reset filters button
  if (resetFiltersBtn) {
    resetFiltersBtn.addEventListener("click", resetFilters);
  }
}

/**
 * Reset all filters and search
 */
function resetFilters() {
  // Reset filter buttons
  filterButtons.forEach((btn) => {
    btn.classList.remove("active");
    if (btn.getAttribute("data-filter") === "all") {
      btn.classList.add("active");
    }
  });

  // Reset search input
  if (projectSearchInput) {
    projectSearchInput.value = "";
  }

  // Reset sort select
  if (projectsSortSelect) {
    projectsSortSelect.value = "newest";
  }

  // Reset global variables
  currentFilter = "all";
  currentSearch = "";
  currentSort = "newest";

  // Apply reset
  applyFiltersAndSort();
}

/**
 * Show loading state
 */
function showLoading() {
  if (projectsGrid) {
    projectsGrid.innerHTML = `
            <div class="loading-container">
                <div class="loading-spinner"></div>
                <p>Loading projects...</p>
            </div>
        `;
  }

  if (featuredProjectContainer) {
    featuredProjectContainer.innerHTML = `
            <div class="featured-placeholder">
                <div class="loading-spinner"></div>
            </div>
        `;
  }
}

/**
 * Hide loading state
 */
function hideLoading() {
  if (projectsGrid) {
    // Remove loading state
    projectsGrid
      .querySelectorAll(".loading-container")
      .forEach((el) => el.remove());
  }

  if (featuredProjectContainer) {
    featuredProjectContainer
      .querySelectorAll(".featured-placeholder")
      .forEach((el) => el.remove());
  }

  // Add animation classes for smooth appearance
  const cards = document.querySelectorAll(".project-card");
  cards.forEach((card, index) => {
    setTimeout(() => {
      card.classList.add("animate-in");
    }, index * 100);
  });
}

/**
 * Show error message
 */
function showError(message) {
  if (projectsGrid) {
    projectsGrid.innerHTML = `
            <div class="error-container">
                <div class="error-icon">
                    <i class="fas fa-exclamation-circle"></i>
                </div>
                <p class="error-message">${message}</p>
                <button class="btn--primary retry-btn">
                    <i class="fas fa-redo"></i> Retry
                </button>
            </div>
        `;

    // Add retry functionality
    const retryBtn = projectsGrid.querySelector(".retry-btn");
    if (retryBtn) {
      retryBtn.addEventListener("click", loadProjects);
    }
  }
}

/**
 * Set up back to top button functionality
 */
function setupBackToTop() {
  if (!backToTopButton) return;

  // Show button after scrolling down 500px
  window.addEventListener("scroll", () => {
    if (window.pageYOffset > 500) {
      backToTopButton.classList.add("visible");
    } else {
      backToTopButton.classList.remove("visible");
    }
  });

  // Scroll to top with smooth animation
  backToTopButton.addEventListener("click", () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  });
}

// Initialize on page load
document.addEventListener("DOMContentLoaded", init);
