/**
 * Admin Panel Main Module
 * Core functionality for the admin interface
 * @author: SRR
 * @version: 2.0
 */

const AdminModule = (function () {
  // Private variables
  let currentPage = "";
  let sidebarVisible = true;
  let darkMode = false;
  let currentUser = null;
  let notifications = [];
  let dashboardStats = null;

  // Cache DOM elements
  const domElements = {
    body: document.body,
    sidebar: document.getElementById("admin-sidebar"),
    sidebarToggle: document.getElementById("sidebar-toggle"),
    contentArea: document.getElementById("admin-content"),
    themeToggle: document.getElementById("theme-toggle"),
    logoutBtn: document.getElementById("logout-btn"),
    notificationBell: document.getElementById("notification-bell"),
    notificationCount: document.getElementById("notification-count"),
    notificationDropdown: document.getElementById("notification-dropdown"),
    userDropdown: document.getElementById("user-dropdown"),
    userDisplayName: document.getElementById("user-display-name"),
    userAvatar: document.getElementById("user-avatar"),
    statsContainers: document.querySelectorAll(".stat-value"),
    lastUpdatedTime: document.querySelectorAll(".last-updated"),
    searchInput: document.getElementById("admin-search"),
    searchResults: document.getElementById("search-results"),
    activityFeed: document.getElementById("activity-feed"),
    quickActions: document.getElementById("quick-actions"),
    breadcrumbs: document.getElementById("breadcrumbs"),
    modalContainer: document.getElementById("modal-container"),
  };

  /**
   * Initialize the admin module
   */
  function init() {
    currentPage = getCurrentPage();
    loadUserSession();
    bindEvents();
    initThemePreference();
    updateLastUpdatedTimes();

    // Initialize page-specific functionality
    initPageSpecific();

    console.log("Admin module initialized");
  }

  /**
   * Get the current page from the URL or data attribute
   * @returns {string} The current page identifier
   */
  function getCurrentPage() {
    // Try to get from data attribute
    const pageData = document.body.dataset.adminPage;
    if (pageData) return pageData;

    // Try to infer from URL
    const path = window.location.pathname;
    const pageName = path.substring(path.lastIndexOf("/") + 1);

    switch (pageName) {
      case "dashboard.html":
        return "dashboard";
      case "edit-projects.html":
        return "projects";
      case "edit-skills.html":
        return "skills";
      case "edit-achievements.html":
        return "achievements";
      case "edit-gallery.html":
        return "gallery";
      case "edit-testimonials.html":
        return "testimonials";
      default:
        return "unknown";
    }
  }

  /**
   * Load user session data
   */
  function loadUserSession() {
    const session = AuthModule.getCurrentSession();
    if (!session) {
      // Redirect to login if not authenticated
      window.location.href = "index.html";
      return;
    }

    currentUser = session.user;

    // Update UI with user info
    if (domElements.userDisplayName) {
      domElements.userDisplayName.textContent = currentUser.username;
    }

    // Set default avatar if not provided
    if (domElements.userAvatar) {
      const avatarUrl =
        currentUser.avatar || "../assets/images/defaults/avatar.png";
      domElements.userAvatar.setAttribute("src", avatarUrl);
    }

    // Load notifications
    loadNotifications();

    // Load dashboard stats if on dashboard
    if (currentPage === "dashboard") {
      loadDashboardStats();
    }
  }

  /**
   * Bind event listeners
   */
  function bindEvents() {
    // Sidebar toggle
    if (domElements.sidebarToggle) {
      domElements.sidebarToggle.addEventListener("click", toggleSidebar);
    }

    // Theme toggle
    if (domElements.themeToggle) {
      domElements.themeToggle.addEventListener("click", toggleTheme);
    }

    // Logout button
    if (domElements.logoutBtn) {
      domElements.logoutBtn.addEventListener("click", handleLogout);
    }

    // Notification bell
    if (domElements.notificationBell) {
      domElements.notificationBell.addEventListener(
        "click",
        toggleNotifications
      );
    }

    // Admin search
    if (domElements.searchInput) {
      domElements.searchInput.addEventListener(
        "input",
        debounce(handleSearch, 300)
      );
      domElements.searchInput.addEventListener("focus", function () {
        domElements.searchResults.classList.remove("hidden");
      });

      // Close search results when clicking outside
      document.addEventListener("click", function (e) {
        if (
          !domElements.searchInput.contains(e.target) &&
          !domElements.searchResults.contains(e.target)
        ) {
          domElements.searchResults.classList.add("hidden");
        }
      });
    }

    // Quick action buttons
    if (domElements.quickActions) {
      domElements.quickActions.addEventListener("click", handleQuickAction);
    }

    // Handle document modals
    document.addEventListener("click", function (e) {
      if (e.target.matches("[data-modal-target]")) {
        const modalId = e.target.getAttribute("data-modal-target");
        openModal(modalId);
      }

      if (
        e.target.matches(".modal-close") ||
        e.target.matches(".modal-backdrop")
      ) {
        closeModal();
      }
    });

    // Add active class to current sidebar item
    if (domElements.sidebar) {
      const sidebarItems =
        domElements.sidebar.querySelectorAll(".sidebar-item");
      sidebarItems.forEach((item) => {
        const itemPage = item.getAttribute("data-page");
        if (itemPage === currentPage) {
          item.classList.add("active");
        }
      });
    }

    // Handle window resize
    window.addEventListener("resize", handleResize);

    // Initialize responsive behavior
    handleResize();
  }

  /**
   * Initialize page-specific functionality
   */
  function initPageSpecific() {
    switch (currentPage) {
      case "dashboard":
        initDashboard();
        break;
      case "projects":
      case "skills":
      case "achievements":
      case "gallery":
      case "testimonials":
        initContentEditor(currentPage);
        break;
    }

    updateBreadcrumbs();
  }

  /**
   * Initialize dashboard-specific functionality
   */
  function initDashboard() {
    // Initialize charts
    initDashboardCharts();

    // Initialize activity feed
    loadActivityFeed();

    // Setup refresh intervals
    setInterval(() => {
      loadDashboardStats();
    }, 60000); // Refresh stats every minute

    // Initialize draggable dashboard widgets if sortable library is available
    if (typeof Sortable !== "undefined") {
      const dashboardGrid = document.querySelector(".dashboard-grid");
      if (dashboardGrid) {
        new Sortable(dashboardGrid, {
          animation: 150,
          handle: ".widget-header",
          ghostClass: "widget-ghost",
          onEnd: function () {
            // Save widget order to localStorage
            const widgets = dashboardGrid.querySelectorAll(".widget");
            const order = Array.from(widgets).map((w) =>
              w.getAttribute("data-widget-id")
            );
            localStorage.setItem(
              "dashboard_widget_order",
              JSON.stringify(order)
            );
          },
        });
      }
    }
  }

  /**
   * Initialize dashboard charts
   */
  function initDashboardCharts() {
    // Check if Chart.js is available
    if (typeof Chart === "undefined") {
      console.warn("Chart.js not loaded. Charts will not be displayed.");
      return;
    }

    // Visits chart
    const visitsCtx = document.getElementById("visits-chart");
    if (visitsCtx) {
      new Chart(visitsCtx, {
        type: "line",
        data: {
          labels: [
            "Jan",
            "Feb",
            "Mar",
            "Apr",
            "May",
            "Jun",
            "Jul",
            "Aug",
            "Sep",
            "Oct",
            "Nov",
            "Dec",
          ],
          datasets: [
            {
              label: "Visits",
              data: [
                1200, 1900, 3000, 2500, 2800, 3500, 4000, 3800, 4200, 4500,
                5000, 5200,
              ],
              borderColor: "#5c6ac4",
              backgroundColor: "rgba(92, 106, 196, 0.1)",
              fill: true,
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              display: false,
            },
          },
          scales: {
            y: {
              beginAtZero: true,
              grid: {
                display: true,
                color: "rgba(0, 0, 0, 0.05)",
              },
            },
            x: {
              grid: {
                display: false,
              },
            },
          },
        },
      });
    }

    // Content distribution chart
    const distributionCtx = document.getElementById("content-distribution");
    if (distributionCtx) {
      new Chart(distributionCtx, {
        type: "doughnut",
        data: {
          labels: [
            "Projects",
            "Skills",
            "Gallery",
            "Testimonials",
            "Achievements",
          ],
          datasets: [
            {
              data: [15, 25, 20, 10, 30],
              backgroundColor: [
                "#5c6ac4",
                "#ff7e5f",
                "#3ecf8e",
                "#fed330",
                "#6772e5",
              ],
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: "70%",
          plugins: {
            legend: {
              position: "bottom",
              labels: {
                boxWidth: 12,
                padding: 15,
              },
            },
          },
        },
      });
    }
  }

  /**
   * Toggle sidebar visibility
   */
  function toggleSidebar() {
    domElements.sidebar.classList.toggle("collapsed");
    domElements.contentArea.classList.toggle("expanded");
    sidebarVisible = !sidebarVisible;

    // Update toggle button icon
    const icon = domElements.sidebarToggle.querySelector("i");
    if (icon) {
      if (sidebarVisible) {
        icon.classList.remove("fa-chevron-right");
        icon.classList.add("fa-chevron-left");
      } else {
        icon.classList.remove("fa-chevron-left");
        icon.classList.add("fa-chevron-right");
      }
    }

    // Save preference
    localStorage.setItem("admin_sidebar_visible", sidebarVisible);
  }

  /**
   * Toggle dark/light theme
   */
  function toggleTheme() {
    darkMode = !darkMode;

    if (darkMode) {
      document.documentElement.classList.add("dark-mode");
      localStorage.setItem("theme_preference", "dark");
    } else {
      document.documentElement.classList.remove("dark-mode");
      localStorage.setItem("theme_preference", "light");
    }

    // Update icon
    const icon = domElements.themeToggle.querySelector("i");
    if (icon) {
      if (darkMode) {
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
      } else {
        icon.classList.remove("fa-sun");
        icon.classList.add("fa-moon");
      }
    }

    // Add animation class
    domElements.themeToggle.classList.add("theme-toggle-animate");
    setTimeout(() => {
      domElements.themeToggle.classList.remove("theme-toggle-animate");
    }, 300);
  }

  /**
   * Initialize theme preference
   */
  function initThemePreference() {
    // Check localStorage first
    const savedPreference = localStorage.getItem("theme_preference");

    // Check if user prefers dark mode
    const prefersDarkMode =
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches;

    // Set dark mode if saved preference is dark or if user prefers dark mode
    darkMode =
      savedPreference === "dark" ||
      (savedPreference === null && prefersDarkMode);

    if (darkMode) {
      document.documentElement.classList.add("dark-mode");

      // Update icon if exists
      const icon = domElements.themeToggle?.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-moon");
        icon.classList.add("fa-sun");
      }
    }

    // Listen for system preference changes
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    mediaQuery.addEventListener("change", (e) => {
      // Only change if user hasn't set a preference
      if (!localStorage.getItem("theme_preference")) {
        darkMode = e.matches;
        if (darkMode) {
          document.documentElement.classList.add("dark-mode");
        } else {
          document.documentElement.classList.remove("dark-mode");
        }

        // Update icon
        const icon = domElements.themeToggle?.querySelector("i");
        if (icon) {
          if (darkMode) {
            icon.classList.remove("fa-moon");
            icon.classList.add("fa-sun");
          } else {
            icon.classList.remove("fa-sun");
            icon.classList.add("fa-moon");
          }
        }
      }
    });
  }

  /**
   * Handle logout action
   */
  function handleLogout() {
    // Show confirmation modal
    openModal("logout-confirm-modal");

    // Handle confirmation
    const confirmBtn = document.querySelector("#confirm-logout-btn");
    if (confirmBtn) {
      // Remove any existing event listeners
      const newConfirmBtn = confirmBtn.cloneNode(true);
      confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);

      // Add new event listener
      newConfirmBtn.addEventListener("click", function () {
        // Show loading indicator
        this.innerHTML =
          '<i class="fas fa-spinner fa-spin"></i> Logging out...';
        this.disabled = true;

        // Perform logout
        AuthModule.logout()
          .then(() => {
            // Show success message
            NotificationModule.showSuccess("Logged out successfully");

            // Redirect to login page after a short delay
            setTimeout(() => {
              window.location.href = "index.html";
            }, 500);
          })
          .catch((error) => {
            NotificationModule.showError(`Logout failed: ${error.message}`);
            closeModal();
          });
      });
    }
  }

  /**
   * Toggle notifications dropdown
   */
  function toggleNotifications() {
    domElements.notificationDropdown.classList.toggle("hidden");

    // Mark notifications as read when opened
    if (!domElements.notificationDropdown.classList.contains("hidden")) {
      markNotificationsAsRead();
    }
  }

  /**
   * Load notifications
   */
  function loadNotifications() {
    // In a real app, you would fetch from an API
    // For demo purposes, we'll use sample data
    notifications = [
      {
        id: 1,
        type: "info",
        message: "Welcome to your admin dashboard!",
        time: new Date(Date.now() - 300000), // 5 minutes ago
        read: false,
      },
      {
        id: 2,
        type: "warning",
        message: "Remember to update your content regularly",
        time: new Date(Date.now() - 3600000), // 1 hour ago
        read: false,
      },
      {
        id: 3,
        type: "success",
        message: "Your changes were published successfully",
        time: new Date(Date.now() - 86400000), // 1 day ago
        read: true,
      },
    ];

    updateNotificationUI();
  }

  /**
   * Update the notification UI
   */
  function updateNotificationUI() {
    // Count unread notifications
    const unreadCount = notifications.filter((n) => !n.read).length;

    // Update notification count
    if (domElements.notificationCount) {
      domElements.notificationCount.textContent = unreadCount;

      if (unreadCount > 0) {
        domElements.notificationCount.classList.remove("hidden");
      } else {
        domElements.notificationCount.classList.add("hidden");
      }
    }

    // Update notification dropdown content
    if (domElements.notificationDropdown) {
      let html = "";

      if (notifications.length === 0) {
        html = '<div class="notification-item empty">No notifications</div>';
      } else {
        notifications.forEach((notification) => {
          const timeAgo = formatTimeAgo(notification.time);
          const readClass = notification.read ? "read" : "unread";
          const typeIcon = getNotificationIcon(notification.type);

          html += `
                        <div class="notification-item ${readClass}" data-id="${notification.id}">
                            <div class="notification-icon ${notification.type}">
                                <i class="${typeIcon}"></i>
                            </div>
                            <div class="notification-content">
                                <div class="notification-message">${notification.message}</div>
                                <div class="notification-time">${timeAgo}</div>
                            </div>
                            <button class="notification-dismiss" aria-label="Dismiss" data-id="${notification.id}">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    `;
        });
      }

      domElements.notificationDropdown.innerHTML = `
                <div class="notification-header">
                    <h3>Notifications</h3>
                    <button class="mark-all-read">Mark all as read</button>
                </div>
                <div class="notification-list">
                    ${html}
                </div>
                <div class="notification-footer">
                    <a href="#">View all notifications</a>
                </div>
            `;

      // Add event listeners for notification actions
      const markAllBtn =
        domElements.notificationDropdown.querySelector(".mark-all-read");
      if (markAllBtn) {
        markAllBtn.addEventListener("click", markNotificationsAsRead);
      }

      const dismissBtns = domElements.notificationDropdown.querySelectorAll(
        ".notification-dismiss"
      );
      dismissBtns.forEach((btn) => {
        btn.addEventListener("click", function (e) {
          e.stopPropagation();
          const id = parseInt(this.getAttribute("data-id"), 10);
          dismissNotification(id);
        });
      });
    }
  }

  /**
   * Mark all notifications as read
   */
  function markNotificationsAsRead() {
    notifications.forEach((notification) => {
      notification.read = true;
    });

    updateNotificationUI();
  }

  /**
   * Dismiss a notification
   * @param {number} id - The notification ID to dismiss
   */
  function dismissNotification(id) {
    notifications = notifications.filter((n) => n.id !== id);
    updateNotificationUI();
  }

  /**
   * Get icon class for notification type
   * @param {string} type - The notification type
   * @returns {string} The font awesome icon class
   */
  function getNotificationIcon(type) {
    switch (type) {
      case "info":
        return "fas fa-info-circle";
      case "success":
        return "fas fa-check-circle";
      case "warning":
        return "fas fa-exclamation-triangle";
      case "error":
        return "fas fa-times-circle";
      default:
        return "fas fa-bell";
    }
  }

  /**
   * Load dashboard statistics
   */
  function loadDashboardStats() {
    // In a real app, you would fetch this from your API
    // For demo purposes, we'll use sample data
    dashboardStats = {
      projects: 15,
      skills: 25,
      testimonials: 10,
      gallery: 20,
      achievements: 15,
      visitorsToday: 120,
      visitorsThisMonth: 3250,
      totalVisitors: 15800,
    };

    updateStatsUI();
  }

  /**
   * Update statistics UI
   */
  function updateStatsUI() {
    if (!dashboardStats) return;

    // Update stat containers if they exist
    domElements.statsContainers.forEach((container) => {
      const statKey = container.getAttribute("data-stat");
      if (statKey && dashboardStats[statKey] !== undefined) {
        // Use animateValue for a nice counter effect
        animateValue(container, 0, dashboardStats[statKey], 1000);
      }
    });
  }

  /**
   * Load activity feed
   */
  function loadActivityFeed() {
    if (!domElements.activityFeed) return;

    // In a real app, you would fetch this from your API
    // For demo purposes, we'll use sample data
    const activities = [
      {
        type: "edit",
        item: "Project: Portfolio Website",
        user: "admin",
        time: new Date(Date.now() - 1800000), // 30 minutes ago
      },
      {
        type: "add",
        item: "New testimonial from John Doe",
        user: "admin",
        time: new Date(Date.now() - 86400000), // 1 day ago
      },
      {
        type: "login",
        item: "Admin login",
        user: "admin",
        time: new Date(Date.now() - 172800000), // 2 days ago
      },
      {
        type: "update",
        item: "Skills section updated",
        user: "admin",
        time: new Date(Date.now() - 259200000), // 3 days ago
      },
    ];

    // Generate activity feed HTML
    let html = "";
    activities.forEach((activity) => {
      const timeAgo = formatTimeAgo(activity.time);
      const icon = getActivityIcon(activity.type);

      html += `
                <div class="activity-item">
                    <div class="activity-icon ${activity.type}">
                        <i class="${icon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-description">
                            <span class="user">${activity.user}</span> 
                            <span class="action">${getActivityAction(
                              activity.type
                            )}</span> 
                            <span class="item">${activity.item}</span>
                        </div>
                        <div class="activity-time">${timeAgo}</div>
                    </div>
                </div>
            `;
    });

    domElements.activityFeed.innerHTML = html;
  }

  /**
   * Get icon for activity type
   * @param {string} type - The activity type
   * @returns {string} The icon class
   */
  function getActivityIcon(type) {
    switch (type) {
      case "add":
        return "fas fa-plus-circle";
      case "edit":
        return "fas fa-edit";
      case "delete":
        return "fas fa-trash-alt";
      case "update":
        return "fas fa-sync-alt";
      case "login":
        return "fas fa-sign-in-alt";
      case "logout":
        return "fas fa-sign-out-alt";
      default:
        return "fas fa-circle";
    }
  }

  /**
   * Get action text for activity type
   * @param {string} type - The activity type
   * @returns {string} The action text
   */
  function getActivityAction(type) {
    switch (type) {
      case "add":
        return "added";
      case "edit":
        return "edited";
      case "delete":
        return "deleted";
      case "update":
        return "updated";
      case "login":
        return "performed";
      case "logout":
        return "performed";
      default:
        return "performed action on";
    }
  }

  /**
   * Handle search functionality
   * @param {Event} e - The input event
   */
  function handleSearch(e) {
    const query = e.target.value.trim().toLowerCase();

    if (query.length < 2) {
      domElements.searchResults.innerHTML =
        '<div class="search-empty">Enter at least 2 characters to search</div>';
      return;
    }

    // In a real app, you would search through your content from the database
    // For demo purposes, we'll use sample data
    const results = searchContent(query);

    // Update search results UI
    if (results.length === 0) {
      domElements.searchResults.innerHTML =
        '<div class="search-empty">No results found</div>';
    } else {
      let html = "";
      results.forEach((result) => {
        html += `
                    <a href="${result.url}" class="search-result-item">
                        <div class="result-icon">
                            <i class="${result.icon}"></i>
                        </div>
                        <div class="result-content">
                            <div class="result-title">${result.title}</div>
                            <div class="result-category">${result.category}</div>
                        </div>
                    </a>
                `;
      });

      domElements.searchResults.innerHTML = html;
    }

    // Show search results
    domElements.searchResults.classList.remove("hidden");
  }

  /**
   * Search through content
   * @param {string} query - The search query
   * @returns {Array} Array of search results
   */
  function searchContent(query) {
    // Sample data for demonstration
    const content = [
      {
        title: "Portfolio Website",
        category: "Projects",
        icon: "fas fa-briefcase",
        url: "edit-projects.html",
      },
      {
        title: "JavaScript Development",
        category: "Skills",
        icon: "fas fa-code",
        url: "edit-skills.html",
      },
      {
        title: "Frontend Developer at TechCorp",
        category: "Experience",
        icon: "fas fa-building",
        url: "edit-achievements.html",
      },
      {
        title: "Project Screenshots",
        category: "Gallery",
        icon: "fas fa-images",
        url: "edit-gallery.html",
      },
      {
        title: "John Doe Testimonial",
        category: "Testimonials",
        icon: "fas fa-comment-alt",
        url: "edit-testimonials.html",
      },
    ];

    // Filter content based on query
    return content.filter((item) => {
      return (
        item.title.toLowerCase().includes(query) ||
        item.category.toLowerCase().includes(query)
      );
    });
  }

  /**
   * Handle quick actions
   * @param {Event} e - The click event
   */
  function handleQuickAction(e) {
    const action = e.target.closest("[data-action]");
    if (!action) return;

    const actionType = action.getAttribute("data-action");

    switch (actionType) {
      case "add-project":
        window.location.href = "edit-projects.html?action=add";
        break;
      case "add-skill":
        window.location.href = "edit-skills.html?action=add";
        break;
      case "add-testimonial":
        window.location.href = "edit-testimonials.html?action=add";
        break;
      case "add-gallery":
        window.location.href = "edit-gallery.html?action=add";
        break;
      case "view-site":
        window.open("../index.html", "_blank");
        break;
      case "export-data":
        exportData();
        break;
      default:
        console.log("Unknown action:", actionType);
    }
  }

  /**
   * Handle window resize
   */
  function handleResize() {
    const width = window.innerWidth;

    // Auto-collapse sidebar on small screens
    if (width < 768 && sidebarVisible) {
      domElements.sidebar.classList.add("collapsed");
      domElements.contentArea.classList.add("expanded");
      sidebarVisible = false;

      // Update toggle button icon
      const icon = domElements.sidebarToggle?.querySelector("i");
      if (icon) {
        icon.classList.remove("fa-chevron-left");
        icon.classList.add("fa-chevron-right");
      }
    } else if (width >= 768 && !sidebarVisible) {
      // Check if user has manually set a preference
      const savedPreference = localStorage.getItem("admin_sidebar_visible");
      if (savedPreference === null || savedPreference === "true") {
        domElements.sidebar.classList.remove("collapsed");
        domElements.contentArea.classList.remove("expanded");
        sidebarVisible = true;

        // Update toggle button icon
        const icon = domElements.sidebarToggle?.querySelector("i");
        if (icon) {
          icon.classList.remove("fa-chevron-right");
          icon.classList.add("fa-chevron-left");
        }
      }
    }
  }

  /**
   * Open a modal dialog
   * @param {string} modalId - The ID of the modal to open
   */
  function openModal(modalId) {
    // Get the modal template
    const modalTemplate = document.querySelector(`#${modalId}`);
    if (!modalTemplate) return;

    // Create modal
    const modal = document.createElement("div");
    modal.className = "modal-wrapper";
    modal.innerHTML = `
            <div class="modal-backdrop"></div>
            <div class="modal">
                ${modalTemplate.innerHTML}
            </div>
        `;

    // Add to container or body
    if (domElements.modalContainer) {
      domElements.modalContainer.appendChild(modal);
    } else {
      document.body.appendChild(modal);
    }

    // Add active class after a short delay for animation
    setTimeout(() => {
      modal.classList.add("active");
    }, 10);

    // Prevent body scrolling
    document.body.classList.add("modal-open");
  }

  /**
   * Close any open modal
   */
  function closeModal() {
    const modal = document.querySelector(".modal-wrapper");
    if (!modal) return;

    // Remove active class for animation
    modal.classList.remove("active");

    // Remove from DOM after animation completes
    setTimeout(() => {
      if (modal.parentNode) {
        modal.parentNode.removeChild(modal);
      }

      // Re-enable body scrolling
      if (!document.querySelector(".modal-wrapper")) {
        document.body.classList.remove("modal-open");
      }
    }, 300);
  }

  /**
   * Update last updated times
   */
  function updateLastUpdatedTimes() {
    if (!domElements.lastUpdatedTime.length) return;

    // Get the last updated time for each content type
    const contentTypes = [
      "projects",
      "skills",
      "achievements",
      "gallery",
      "testimonials",
    ];

    contentTypes.forEach((type) => {
      // Try to get from localStorage first
      const lastUpdated = localStorage.getItem(`last_updated_${type}`);

      domElements.lastUpdatedTime.forEach((element) => {
        if (element.getAttribute("data-content-type") === type) {
          if (lastUpdated) {
            element.textContent = `Last updated: ${new Date(
              lastUpdated
            ).toLocaleString()}`;
          } else {
            element.textContent = "Not updated yet";
          }
        }
      });

      // If not in localStorage, try to get from the file's last modified date
      if (!lastUpdated) {
        fetch(`../data/${type}.json`)
          .then((response) => {
            const lastModified = response.headers.get("last-modified");
            if (lastModified) {
              const formattedDate = new Date(lastModified).toLocaleString();
              localStorage.setItem(`last_updated_${type}`, lastModified);

              domElements.lastUpdatedTime.forEach((element) => {
                if (element.getAttribute("data-content-type") === type) {
                  element.textContent = `Last updated: ${formattedDate}`;
                }
              });
            }
          })
          .catch((error) => {
            console.warn(
              `Could not get last modified date for ${type}.json:`,
              error
            );
          });
      }
    });
  }

  /**
   * Update breadcrumbs for current page
   */
  function updateBreadcrumbs() {
    if (!domElements.breadcrumbs) return;

    const pageTitles = {
      dashboard: "Dashboard",
      projects: "Edit Projects",
      skills: "Edit Skills",
      achievements: "Edit Achievements",
      gallery: "Edit Gallery",
      testimonials: "Edit Testimonials",
    };

    const pageTitle = pageTitles[currentPage] || "Unknown Page";

    domElements.breadcrumbs.innerHTML = `
            <li><a href="dashboard.html">Dashboard</a></li>
            ${currentPage !== "dashboard" ? `<li>${pageTitle}</li>` : ""}
        `;
  }

  /**
   * Export data functionality
   */
  function exportData() {
    openModal("export-data-modal");

    // Handle export format selection
    const exportBtn = document.querySelector("#export-data-btn");
    if (exportBtn) {
      exportBtn.addEventListener("click", function () {
        const format = document.querySelector(
          'input[name="export-format"]:checked'
        ).value;
        const includeImages = document.querySelector("#include-images").checked;

        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Exporting...';
        this.disabled = true;

        // In a real app, you would call your export API here
        // For demo, simulate the export process
        setTimeout(() => {
          // Success
          this.innerHTML = '<i class="fas fa-check"></i> Export Complete';

          // Generate a download link
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const filename = `portfolio-export-${timestamp}.${format}`;

          const downloadLink = document.createElement("a");
          downloadLink.href = "#";
          downloadLink.classList.add("btn", "btn-primary", "mt-3");
          downloadLink.innerText = "Download Export";
          downloadLink.addEventListener("click", function (e) {
            e.preventDefault();
            NotificationModule.showSuccess(
              `Export file "${filename}" would download in a real app.`
            );
          });

          // Add download link to modal
          const modalFooter = document.querySelector(".modal .modal-footer");
          if (modalFooter) {
            modalFooter.appendChild(downloadLink);
          }
        }, 2000);
      });
    }
  }

  /**
   * Initialize projects editor
   */
  function initProjectsEditor() {
    // This will be handled by the editor module
    console.log("Projects editor initialized");
  }

  /**
   * Initialize skills editor
   */
  function initSkillsEditor() {
    // This will be handled by the editor module
    console.log("Skills editor initialized");
  }

  /**
   * Initialize achievements editor
   */
  function initAchievementsEditor() {
    // This will be handled by the editor module
    console.log("Achievements editor initialized");
  }

  /**
   * Initialize gallery editor
   */
  function initGalleryEditor() {
    // This will be handled by the editor module
    console.log("Gallery editor initialized");
  }

  /**
   * Initialize testimonials editor
   */
  function initTestimonialsEditor() {
    // This will be handled by the editor module
    console.log("Testimonials editor initialized");
  }

  /**
   * Initialize generic content editor
   */
  function initContentEditor(contentType) {
    const editor = new ContentEditor({
      type: contentType,
      container: document.getElementById(`${contentType}-container`),
      uploadEnabled: ["projects", "gallery", "testimonials"].includes(
        contentType
      ),
      imageCompression: {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
      },
      autoSave: true,
      githubSync: true,
    });

    editor.init();
  }

  /**
   * Animate a value from start to end
   * @param {HTMLElement} element - The element to update
   * @param {number} start - The start value
   * @param {number} end - The end value
   * @param {number} duration - The animation duration in milliseconds
   */
  function animateValue(element, start, end, duration) {
    // Use current value as start if present
    const currentValue = parseInt(element.textContent, 10);
    if (!isNaN(currentValue)) {
      start = currentValue;
    }

    const range = end - start;
    const minFrames = 30;
    const timeStart = new Date().getTime();

    // Don't animate small changes
    if (Math.abs(range) <= 5) {
      element.textContent = end;
      return;
    }

    const updateValue = () => {
      const timeNow = new Date().getTime();
      const elapsed = timeNow - timeStart;

      if (elapsed > duration) {
        element.textContent = end;
        return;
      }

      const progress = elapsed / duration;
      const currentValue = Math.floor(start + range * progress);
      element.textContent = currentValue;

      requestAnimationFrame(updateValue);
    };

    requestAnimationFrame(updateValue);
  }

  /**
   * Format a date as a time ago string
   * @param {Date} date - The date to format
   * @returns {string} Formatted time ago string
   */
  function formatTimeAgo(date) {
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) {
      return "Just now";
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
      return `${minutes} minute${minutes !== 1 ? "s" : ""} ago`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
      return `${hours} hour${hours !== 1 ? "s" : ""} ago`;
    }

    const days = Math.floor(hours / 24);
    if (days < 7) {
      return `${days} day${days !== 1 ? "s" : ""} ago`;
    }

    const weeks = Math.floor(days / 7);
    if (weeks < 4) {
      return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
    }

    const months = Math.floor(days / 30);
    if (months < 12) {
      return `${months} month${months !== 1 ? "s" : ""} ago`;
    }

    const years = Math.floor(days / 365);
    return `${years} year${years !== 1 ? "s" : ""} ago`;
  }

  /**
   * Debounce function to limit how often a function is called
   * @param {Function} func - The function to debounce
   * @param {number} wait - The debounce wait time in milliseconds
   * @returns {Function} Debounced function
   */
  function debounce(func, wait) {
    let timeout;
    return function (...args) {
      clearTimeout(timeout);
      timeout = setTimeout(() => func.apply(this, args), wait);
    };
  }

  // Public API
  return {
    init,
    toggleTheme,
    toggleSidebar,
    openModal,
    closeModal,
  };
})();

// Initialize when DOM is ready
document.addEventListener("DOMContentLoaded", AdminModule.init);
