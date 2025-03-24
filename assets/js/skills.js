/**
 * Skills page functionality
 * Handles loading, filtering, and visualizing skills data
 */

document.addEventListener("DOMContentLoaded", () => {
  // Initialize skills functionality
  initSkills();

  // Initialize stats counter animation
  initStatsCounter();

  // Initialize scroll animations for timeline items
  initTimelineAnimations();
});

/**
 * Initialize skills functionality - loading and displaying
 */
async function initSkills() {
  try {
    // Load skills data from JSON file
    const skills = await fetchData("data/skills.json");

    if (skills && skills.length) {
      // Render skills grid
      renderSkills(skills);

      // Setup category filters
      setupCategoryFilters(skills);

      // Initialize skill charts
      initSkillCharts(skills);
    }
  } catch (error) {
    console.error("Error initializing skills:", error);
    document.getElementById("skills-grid").innerHTML = `
      <div class="error-message">
        <i class="fas fa-exclamation-triangle"></i>
        <p>Failed to load skills data. Please try again later.</p>
      </div>
    `;
  }
}

/**
 * Render skills grid with data
 * @param {Array} skills - Array of skill objects
 */
function renderSkills(skills) {
  const skillsGrid = document.getElementById("skills-grid");

  // Clear loading spinner
  skillsGrid.innerHTML = "";

  // Sort skills by level (highest first)
  const sortedSkills = [...skills].sort((a, b) => b.level - a.level);

  // Render each skill card with animation delay
  sortedSkills.forEach((skill, index) => {
    const skillCard = document.createElement("div");
    skillCard.className = "skill-card";
    skillCard.dataset.category = skill.category;
    skillCard.style.animationDelay = `${index * 0.05}s`;

    skillCard.innerHTML = `
      <div class="skill-icon" style="background-color: ${skill.color}20; color: ${skill.color}">
        <i class="${skill.icon}"></i>
      </div>
      <h3>${skill.name}</h3>
      <div class="skill-level">
        <div class="skill-progress" style="width: ${skill.level}%; background-color: ${skill.color}"></div>
        <span class="skill-percentage">${skill.level}%</span>
      </div>
      <p class="skill-experience">Experience: ${skill.experience}</p>
      <div class="skill-description">${skill.description}</div>
    `;

    // Add click handler to show more details
    skillCard.addEventListener("click", () => showSkillDetails(skill));

    skillsGrid.appendChild(skillCard);
  });
}

/**
 * Show detailed skill information in a modal
 * @param {Object} skill - Skill object with detailed information
 */
function showSkillDetails(skill) {
  // Create modal element
  const modal = document.createElement("div");
  modal.className = "modal skill-detail-modal";

  // Create certification badges if available
  let certificationBadges = "";
  if (skill.certifications && skill.certifications.length) {
    certificationBadges = `
      <div class="skill-certifications">
        <h4>Certifications</h4>
        <div class="certification-badges">
          ${skill.certifications
            .map((cert) => `<span class="certification-badge">${cert}</span>`)
            .join("")}
        </div>
      </div>
    `;
  }

  // Create project list if available
  let projectsList = "";
  if (skill.projects && skill.projects.length) {
    projectsList = `
      <div class="skill-projects">
        <h4>Related Projects</h4>
        <ul>
          ${skill.projects.map((project) => `<li>${project}</li>`).join("")}
        </ul>
      </div>
    `;
  }

  // Populate modal content
  modal.innerHTML = `
    <div class="modal-content">
      <div class="modal-header" style="border-color: ${skill.color}">
        <div class="modal-skill-icon" style="background-color: ${
          skill.color
        }20; color: ${skill.color}">
          <i class="${skill.icon}"></i>
        </div>
        <h2>${skill.name}</h2>
        <span class="modal-close">&times;</span>
      </div>
      <div class="modal-body">
        <div class="skill-detail-info">
          <div class="skill-proficiency">
            <h4>Proficiency Level</h4>
            <div class="skill-level-detail">
              <div class="skill-progress-detail" style="width: ${
                skill.level
              }%; background-color: ${skill.color}"></div>
              <span>${skill.level}%</span>
            </div>
          </div>
          
          <div class="skill-metadata">
            <p><strong>Category:</strong> ${capitalizeFirstLetter(
              skill.category
            )}</p>
            <p><strong>Experience:</strong> ${skill.experience}</p>
          </div>
          
          <div class="skill-description-detail">
            <h4>Description</h4>
            <p>${skill.description}</p>
          </div>
          
          ${certificationBadges}
          ${projectsList}
        </div>
      </div>
    </div>
  `;

  // Add modal to document
  document.body.appendChild(modal);

  // Make modal visible with animation
  setTimeout(() => {
    modal.classList.add("active");
  }, 10);

  // Setup close handler
  const closeButton = modal.querySelector(".modal-close");
  closeButton.addEventListener("click", () => {
    modal.classList.remove("active");
    setTimeout(() => {
      document.body.removeChild(modal);
    }, 300);
  });

  // Close on click outside
  modal.addEventListener("click", (e) => {
    if (e.target === modal) {
      modal.classList.remove("active");
      setTimeout(() => {
        document.body.removeChild(modal);
      }, 300);
    }
  });
}

/**
 * Setup skill category filtering
 * @param {Array} skills - Array of skill objects
 */
function setupCategoryFilters(skills) {
  const categoryTabs = document.querySelectorAll(".category-tab");
  const skillCards = document.querySelectorAll(".skill-card");
  const noResultsElement = document.getElementById("no-skills-found");

  categoryTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      // Update active tab
      categoryTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const category = tab.dataset.category;
      let visibleCount = 0;

      // Filter skill cards
      skillCards.forEach((card) => {
        // Reset animation delay for smooth filtering
        card.style.animationDelay = "0s";

        if (category === "all" || card.dataset.category === category) {
          card.style.display = "";
          // Add the animation class to trigger the animation
          card.classList.remove("skill-card");
          setTimeout(() => {
            card.classList.add("skill-card");
          }, 10);
          visibleCount++;
        } else {
          card.style.display = "none";
        }
      });

      // Show/hide no results message
      if (visibleCount === 0) {
        noResultsElement.style.display = "flex";
      } else {
        noResultsElement.style.display = "none";
      }
    });
  });
}

/**
 * Initialize skill visualization charts
 * @param {Array} skills - Array of skill objects
 */
function initSkillCharts(skills) {
  // Create radar chart for skill distribution
  createRadarChart(skills);

  // Create bar chart for top skills
  createBarChart(skills);

  // Create experience duration chart
  createExperienceChart(skills);

  // Create category distribution chart
  createCategoryDistributionChart(skills);
}

/**
 * Create radar chart for skill distribution by category
 * @param {Array} skills - Array of skill objects
 */
function createRadarChart(skills) {
  const ctx = document.getElementById("skillRadarChart").getContext("2d");

  // Get average skill level by category
  const categories = ["frontend", "backend", "languages", "tools", "aiml"];
  const categoryData = categories.map((category) => {
    const categorySkills = skills.filter(
      (skill) => skill.category === category
    );
    if (categorySkills.length === 0) return 0;

    const average =
      categorySkills.reduce((sum, skill) => sum + skill.level, 0) /
      categorySkills.length;
    return Math.round(average);
  });

  // Format category labels
  const categoryLabels = categories.map(capitalizeFirstLetter);

  new Chart(ctx, {
    type: "radar",
    data: {
      labels: categoryLabels,
      datasets: [
        {
          label: "Skill Level",
          data: categoryData,
          backgroundColor: "rgba(54, 162, 235, 0.2)",
          borderColor: "rgba(54, 162, 235, 1)",
          borderWidth: 2,
          pointBackgroundColor: "rgba(54, 162, 235, 1)",
          pointRadius: 4,
        },
      ],
    },
    options: {
      scales: {
        r: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20,
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `Skill Level: ${context.raw}%`;
            },
          },
        },
      },
    },
  });
}

/**
 * Create bar chart for top skills
 * @param {Array} skills - Array of skill objects
 */
function createBarChart(skills) {
  const ctx = document.getElementById("skillBarChart").getContext("2d");

  // Get top 8 skills by level
  const topSkills = [...skills].sort((a, b) => b.level - a.level).slice(0, 8);

  // Extract data for chart
  const labels = topSkills.map((skill) => skill.name);
  const data = topSkills.map((skill) => skill.level);
  const backgroundColors = topSkills.map((skill) => `${skill.color}80`);
  const borderColors = topSkills.map((skill) => skill.color);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Skill Level",
          data: data,
          backgroundColor: backgroundColors,
          borderColor: borderColors,
          borderWidth: 1,
        },
      ],
    },
    options: {
      indexAxis: "y",
      scales: {
        x: {
          beginAtZero: true,
          max: 100,
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              return `Proficiency: ${context.raw}%`;
            },
          },
        },
      },
    },
  });
}

/**
 * Create experience duration chart
 * @param {Array} skills - Array of skill objects
 */
function createExperienceChart(skills) {
  const ctx = document.getElementById("experienceChart").getContext("2d");

  // Parse experience into months for better comparison
  const skillsWithMonths = skills
    .filter((skill) => skill.experience) // Filter out any without experience data
    .map((skill) => {
      let months = 0;
      const exp = skill.experience;

      // Parse years
      if (exp.includes("year")) {
        const years = parseInt(exp);
        if (!isNaN(years)) months += years * 12;
      }

      // Parse months
      if (exp.includes("month")) {
        const monthMatch = exp.match(/(\d+)\s*month/);
        if (monthMatch && monthMatch[1]) {
          months += parseInt(monthMatch[1]);
        }
      }

      return {
        ...skill,
        months,
      };
    })
    .sort((a, b) => b.months - a.months) // Sort by experience duration
    .slice(0, 10); // Get top 10

  // Format data for chart
  const labels = skillsWithMonths.map((skill) => skill.name);
  const data = skillsWithMonths.map((skill) => skill.months);
  const backgroundColors = skillsWithMonths.map((skill) => `${skill.color}80`);

  new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Experience",
          data: data,
          backgroundColor: backgroundColors,
          borderWidth: 0,
        },
      ],
    },
    options: {
      indexAxis: "y",
      scales: {
        x: {
          beginAtZero: true,
          title: {
            display: true,
            text: "Months",
          },
        },
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              const months = context.raw;
              const years = Math.floor(months / 12);
              const remainingMonths = months % 12;

              if (years > 0 && remainingMonths > 0) {
                return `Experience: ${years} year${
                  years !== 1 ? "s" : ""
                }, ${remainingMonths} month${remainingMonths !== 1 ? "s" : ""}`;
              } else if (years > 0) {
                return `Experience: ${years} year${years !== 1 ? "s" : ""}`;
              } else {
                return `Experience: ${months} month${months !== 1 ? "s" : ""}`;
              }
            },
          },
        },
      },
    },
  });
}

/**
 * Create category distribution pie chart
 * @param {Array} skills - Array of skill objects
 */
function createCategoryDistributionChart(skills) {
  const ctx = document
    .getElementById("categoryDistributionChart")
    .getContext("2d");

  // Count skills by category
  const categoryCounts = {};
  skills.forEach((skill) => {
    if (!categoryCounts[skill.category]) {
      categoryCounts[skill.category] = 0;
    }
    categoryCounts[skill.category]++;
  });

  // Prepare data for pie chart
  const categories = Object.keys(categoryCounts);
  const counts = categories.map((category) => categoryCounts[category]);
  const labels = categories.map(capitalizeFirstLetter);

  // Define colors for each category
  const categoryColors = {
    frontend: "#e74c3c",
    backend: "#3498db",
    languages: "#2ecc71",
    tools: "#f39c12",
    aiml: "#9b59b6",
  };

  const backgroundColors = categories.map(
    (category) => categoryColors[category] || "#777"
  );

  new Chart(ctx, {
    type: "pie",
    data: {
      labels: labels,
      datasets: [
        {
          data: counts,
          backgroundColor: backgroundColors,
          borderWidth: 1,
        },
      ],
    },
    options: {
      plugins: {
        tooltip: {
          callbacks: {
            label: function (context) {
              const label = context.label || "";
              const value = context.raw;
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${value} skills (${percentage}%)`;
            },
          },
        },
      },
    },
  });
}

/**
 * Animate stats counter on scroll
 */
function initStatsCounter() {
  const statCounters = document.querySelectorAll(".stat-count");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const counter = entry.target;
          const target = parseInt(counter.getAttribute("data-count"));
          const duration = 2000; // 2 seconds
          const increment = target / (duration / 16); // Update every ~16ms for 60fps

          let current = 0;
          const timer = setInterval(() => {
            current += increment;
            counter.textContent = Math.floor(current);

            if (current >= target) {
              counter.textContent = target;
              clearInterval(timer);
            }
          }, 16);

          // Only animate once
          observer.unobserve(counter);
        }
      });
    },
    { threshold: 0.5 }
  );

  statCounters.forEach((counter) => {
    observer.observe(counter);
  });
}

/**
 * Animate timeline items on scroll
 */
function initTimelineAnimations() {
  const timelineItems = document.querySelectorAll(".timeline-item");

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("animate");
          // Only animate once
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.2 }
  );

  timelineItems.forEach((item) => {
    observer.observe(item);
  });
}

/**
 * Utility function to capitalize first letter of a string
 * @param {string} str - Input string
 * @returns {string} Capitalized string
 */
function capitalizeFirstLetter(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * Utility function to fetch data from a JSON file
 * @param {string} url - URL of the JSON file
 * @returns {Promise<Object>} Parsed JSON data
 */
async function fetchData(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error fetching data:", error);
    throw error;
  }
}
