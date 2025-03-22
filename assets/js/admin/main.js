/**
 * Admin Panel Main JavaScript
 * Author: Md. Shahriar Rakib Rabbi
 * 
 * This file contains core functionality for the portfolio admin panel
 * including navigation, dashboard, and general UI interactions.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize admin panel
    initAdminPanel();
});

/**
 * Initialize the admin panel
 */
function initAdminPanel() {
    // Check if user is authenticated
    if (!Auth.isAuthenticated()) {
        return;
    }
    
    // Initialize UI components
    initSidebar();
    initDashboard();
    initNotifications();
    initAdminUI();
    setupEventListeners();
    updateUserInfo();
}

/**
 * Initialize sidebar navigation
 */
function initSidebar() {
    const sidebarToggle = document.querySelector('.sidebar-toggle');
    const sidebar = document.querySelector('.admin-sidebar');
    const content = document.querySelector('.admin-content');
    
    if (sidebarToggle && sidebar) {
        // Toggle sidebar on button click
        sidebarToggle.addEventListener('click', function() {
            sidebar.classList.toggle('collapsed');
            content.classList.toggle('expanded');
            
            // Save preference in localStorage
            localStorage.setItem('admin_sidebar_collapsed', sidebar.classList.contains('collapsed'));
        });
        
        // Check for saved preference
        const sidebarState = localStorage.getItem('admin_sidebar_collapsed');
        if (sidebarState === 'true') {
            sidebar.classList.add('collapsed');
            content.classList.add('expanded');
        }
    }
    
    // Handle mobile sidebar
    const mobileToggle = document.querySelector('.mobile-sidebar-toggle');
    if (mobileToggle && sidebar) {
        mobileToggle.addEventListener('click', function() {
            sidebar.classList.toggle('mobile-open');
        });
        
        // Close sidebar when clicking outside
        document.addEventListener('click', function(e) {
            if (sidebar.classList.contains('mobile-open') && 
                !sidebar.contains(e.target) && 
                e.target !== mobileToggle) {
                sidebar.classList.remove('mobile-open');
            }
        });
    }
    
    // Set active menu item based on current page
    const currentPage = window.location.pathname;
    document.querySelectorAll('.sidebar-menu a').forEach(link => {
        if (currentPage.endsWith(link.getAttribute('href'))) {
            link.classList.add('active');
            
            // Expand parent menu item if in a submenu
            const parentMenuItem = link.closest('.has-submenu');
            if (parentMenuItem) {
                parentMenuItem.classList.add('open');
            }
        }
    });
    
    // Toggle submenu items
    document.querySelectorAll('.has-submenu > a').forEach(menuItem => {
        menuItem.addEventListener('click', function(e) {
            e.preventDefault();
            
            const parent = this.parentElement;
            parent.classList.toggle('open');
            
            // Save state in localStorage
            const menuId = parent.getAttribute('data-menu-id');
            if (menuId) {
                localStorage.setItem(`admin_menu_${menuId}_open`, parent.classList.contains('open'));
            }
        });
        
        // Check for saved state
        const parent = menuItem.parentElement;
        const menuId = parent.getAttribute('data-menu-id');
        if (menuId) {
            const menuState = localStorage.getItem(`admin_menu_${menuId}_open`);
            if (menuState === 'true') {
                parent.classList.add('open');
            }
        }
    });
}

/**
 * Initialize dashboard elements
 */
function initDashboard() {
    const dashboardPage = document.querySelector('.dashboard-page');
    if (!dashboardPage) return;
    
    // Load dashboard statistics
    loadDashboardStats();
    
    // Initialize charts if Chart.js is available
    if (typeof Chart !== 'undefined') {
        initDashboardCharts();
    }
    
    // Load recent activities
    loadRecentActivities();
    
    // Set up dashboard refresh button
    const refreshBtn = document.getElementById('refresh-dashboard');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', function() {
            this.classList.add('rotating');
            
            // Reload dashboard data
            Promise.all([
                loadDashboardStats(),
                loadRecentActivities()
            ]).then(() => {
                // Stop rotation and show success message
                this.classList.remove('rotating');
                showNotification('Dashboard data refreshed', 'success');
            }).catch(() => {
                this.classList.remove('rotating');
                showNotification('Error refreshing dashboard data', 'error');
            });
        });
    }
}

/**
 * Load dashboard statistics
 * @returns {Promise} Promise that resolves when stats are loaded
 */
function loadDashboardStats() {
    return new Promise((resolve, reject) => {
        // In a real app, this would fetch from an API endpoint
        // For this demo, we'll load data files and calculate stats
        
        Promise.all([
            loadData('data/projects.json'),
            loadData('data/skills.json'),
            loadData('data/achievements.json'),
            loadData('data/testimonials.json'),
            loadData('data/gallery.json')
        ]).then(([projects, skills, achievements, testimonials, gallery]) => {
            // Update stats counters with animation
            updateStatCounter('projects-count', projects.length || 0);
            updateStatCounter('skills-count', skills.length || 0);
            updateStatCounter('achievements-count', achievements.length || 0);
            updateStatCounter('testimonials-count', testimonials.length || 0);
            updateStatCounter('gallery-count', gallery.length || 0);
            
            // Update last updated time
            document.querySelectorAll('.last-updated').forEach(el => {
                el.textContent = new Date().toLocaleString();
            });
            
            resolve();
        }).catch(error => {
            console.error('Failed to load dashboard statistics:', error);
            reject(error);
        });
    });
}

/**
 * Initialize dashboard charts
 */
function initDashboardCharts() {
    // Visitor statistics chart
    const visitorChart = document.getElementById('visitors-chart');
    if (visitorChart) {
        new Chart(visitorChart.getContext('2d'), {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                datasets: [{
                    label: 'Visitors',
                    data: [500, 800, 1200, 1700, 1500, 1800, 2000, 2200, 1900, 2100, 2500, 2700],
                    backgroundColor: 'rgba(78, 115, 223, 0.2)',
                    borderColor: 'rgba(78, 115, 223, 1)',
                    borderWidth: 2,
                    tension: 0.3,
                    pointBackgroundColor: 'rgba(78, 115, 223, 1)'
                }]
            },
            options: {
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        }
                    }
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false
                    }
                }
            }
        });
    }
    
    // Content distribution chart
    const contentChart = document.getElementById('content-chart');
    if (contentChart) {
        Promise.all([
            loadData('data/projects.json'),
            loadData('data/skills.json'),
            loadData('data/achievements.json'),
            loadData('data/testimonials.json'),
            loadData('data/gallery.json')
        ]).then(([projects, skills, achievements, testimonials, gallery]) => {
            new Chart(contentChart.getContext('2d'), {
                type: 'doughnut',
                data: {
                    labels: ['Projects', 'Skills', 'Achievements', 'Testimonials', 'Gallery'],
                    datasets: [{
                        data: [
                            projects.length || 0,
                            skills.length || 0,
                            achievements.length || 0,
                            testimonials.length || 0,
                            gallery.length || 0
                        ],
                        backgroundColor: [
                            '#4e73df',
                            '#1cc88a',
                            '#36b9cc',
                            '#f6c23e',
                            '#e74a3b'
                        ]
                    }]
                },
                options: {
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    },
                    cutout: '70%'
                }
            });
        }).catch(error => {
            console.error('Failed to load chart data:', error);
        });
    }
}

/**
 * Animate counting for statistics
 * @param {string} elementId - Element ID to update
 * @param {number} targetValue - Target value to count to
 */
function updateStatCounter(elementId, targetValue) {
    const element = document.getElementById(elementId);
    if (!element) return;
    
    // Set starting value
    let currentValue = 0;
    
    // Calculate increment and duration
    const steps = 30; // Number of steps in the animation
    const increment = targetValue / steps;
    const duration = 1000; // 1 second animation
    const interval = duration / steps;
    
    // Start animation
    const timer = setInterval(() => {
        currentValue += increment;
        
        // Ensure we don't exceed target
        if (currentValue >= targetValue) {
            clearInterval(timer);
            currentValue = targetValue;
        }
        
        // Update element text
        element.textContent = Math.floor(currentValue);
    }, interval);
}

/**
 * Load recent activities for dashboard
 */
function loadRecentActivities() {
    const activitiesList = document.getElementById('recent-activities');
    if (!activitiesList) return;
    
    // Show loading indicator
    activitiesList.innerHTML = '<div class="loading-indicator"><i class="fas fa-circle-notch fa-spin"></i> Loading activities...</div>';
    
    return new Promise((resolve, reject) => {
        // In a real app, this would be an API call
        // For this demo, we'll simulate a small delay and use mock data
        setTimeout(() => {
            // Mock activities data
            const activities = [
                {
                    type: 'edit',
                    description: 'Updated project "Portfolio Website"',
                    user: 'Md. Shahriar Rakib Rabbi',
                    timestamp: new Date(Date.now() - 30 * 60000).toLocaleString(),
                    icon: 'fa-edit',
                    color: 'text-blue'
                },
                {
                    type: 'add',
                    description: 'Added new skill "React Native"',
                    user: 'Md. Shahriar Rakib Rabbi',
                    timestamp: new Date(Date.now() - 2 * 3600000).toLocaleString(),
                    icon: 'fa-plus-circle',
                    color: 'text-green'
                },
                {
                    type: 'delete',
                    description: 'Removed outdated testimonial',
                    user: 'Md. Shahriar Rakib Rabbi',
                    timestamp: new Date(Date.now() - 5 * 3600000).toLocaleString(),
                    icon: 'fa-trash-alt',
                    color: 'text-red'
                },
                {
                    type: 'login',
                    description: 'Logged in to admin panel',
                    user: 'Md. Shahriar Rakib Rabbi',
                    timestamp: new Date(Date.now() - 8 * 3600000).toLocaleString(),
                    icon: 'fa-sign-in-alt',
                    color: 'text-purple'
                },
                {
                    type: 'export',
                    description: 'Exported site data backup',
                    user: 'Md. Shahriar Rakib Rabbi',
                    timestamp: new Date(Date.now() - 1 * 86400000).toLocaleString(),
                    icon: 'fa-file-export',
                    color: 'text-orange'
                }
            ];
            
            // Clear and populate the list
            activitiesList.innerHTML = '';
            
            if (activities.length === 0) {
                activitiesList.innerHTML = '<div class="no-activities">No recent activities found</div>';
                resolve();
                return;
            }
            
            activities.forEach(activity => {
                const item = document.createElement('div');
                item.className = 'activity-item';
                item.innerHTML = `
                    <div class="activity-icon ${activity.color}">
                        <i class="fas ${activity.icon}"></i>
                    </div>
                    <div class="activity-content">
                        <div class="activity-description">${activity.description}</div>
                        <div class="activity-meta">
                            <span class="activity-user">${activity.user}</span>
                            <span class="activity-time">${activity.timestamp}</span>
                        </div>
                    </div>
                `;
                activitiesList.appendChild(item);
            });
            
            resolve();
        }, 800);
    });
}

/**
 * Initialize notification system
 */
function initNotifications() {
    // Check for notifications on load
    checkForNotifications();
    
    // Notification center toggle
    const notificationToggle = document.querySelector('.notification-toggle');
    const notificationCenter = document.querySelector('.notification-center');
    
    if (notificationToggle && notificationCenter) {
        notificationToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            notificationCenter.classList.toggle('show');
            
            // Mark as read when opened
            if (notificationCenter.classList.contains('show')) {
                markNotificationsAsRead();
            }
        });
        
        // Close when clicking outside
        document.addEventListener('click', function(e) {
            if (notificationCenter.classList.contains('show') && 
                !notificationCenter.contains(e.target) && 
                e.target !== notificationToggle) {
                notificationCenter.classList.remove('show');
            }
        });
        
        // Prevent clicks inside notification center from closing it
        notificationCenter.addEventListener('click', function(e) {
            e.stopPropagation();
        });
        
        // Mark all as read button
        const markReadBtn = notificationCenter.querySelector('.mark-all-read');
        if (markReadBtn) {
            markReadBtn.addEventListener('click', function() {
                markNotificationsAsRead();
                showNotification('All notifications marked as read', 'success');
            });
        }
    }
}

/**
 * Check for new notifications
 */
function checkForNotifications() {
    // In a real app, this would fetch from an API
    // For this demo, we'll use mock notifications
    const notifications = [
        {
            id: 1,
            title: 'New comment received',
            message: 'Someone commented on your latest project',
            time: '10 minutes ago',
            read: false,
            type: 'comment'
        },
        {
            id: 2,
            title: 'System update available',
            message: 'A new version of the admin panel is available',
            time: '1 hour ago',
            read: false,
            type: 'system'
        },
        {
            id: 3,
            title: 'Backup reminder',
            message: 'Remember to backup your data regularly',
            time: '1 day ago',
            read: true,
            type: 'reminder'
        }
    ];
    
    updateNotificationUI(notifications);
}

/**
 * Update notification UI with notification data
 * @param {Array} notifications - Array of notification objects
 */
function updateNotificationUI(notifications) {
    const notificationCount = document.querySelector('.notification-count');
    const notificationList = document.querySelector('.notification-list');
    
    if (!notificationCount || !notificationList) return;
    
    // Count unread notifications
    const unreadCount = notifications.filter(n => !n.read).length;
    
    // Update counter
    notificationCount.textContent = unreadCount;
    notificationCount.style.display = unreadCount > 0 ? 'flex' : 'none';
    
    // Update notification list
    notificationList.innerHTML = '';
    
    if (notifications.length === 0) {
        notificationList.innerHTML = '<div class="no-notifications">No notifications</div>';
        return;
    }
    
    notifications.forEach(notification => {
        const item = document.createElement('div');
        item.className = `notification-item ${notification.read ? 'read' : 'unread'}`;
        item.setAttribute('data-id', notification.id);
        
        // Determine icon based on type
        let icon = 'fa-bell';
        switch (notification.type) {
            case 'comment':
                icon = 'fa-comment';
                break;
            case 'system':
                icon = 'fa-cog';
                break;
            case 'reminder':
                icon = 'fa-calendar';
                break;
        }
        
        item.innerHTML = `
            <div class="notification-icon">
                <i class="fas ${icon}"></i>
            </div>
            <div class="notification-content">
                <div class="notification-title">${notification.title}</div>
                <div class="notification-message">${notification.message}</div>
                <div class="notification-time">${notification.time}</div>
            </div>
            <button class="notification-mark-read" title="Mark as ${notification.read ? 'unread' : 'read'}">
                <i class="fas ${notification.read ? 'fa-envelope' : 'fa-envelope-open'}"></i>
            </button>
        `;
        
        // Add click handler to mark as read
        item.querySelector('.notification-mark-read').addEventListener('click', function(e) {
            e.stopPropagation();
            toggleNotificationRead(notification.id);
        });
        
        notificationList.appendChild(item);
    });
}

/**
 * Toggle read status of a notification
 * @param {number} id - Notification ID
 */
function toggleNotificationRead(id) {
    // In a real app, this would call an API
    // For this demo, we'll just toggle the UI
    
    const item = document.querySelector(`.notification-item[data-id="${id}"]`);
    if (!item) return;
    
    const isRead = item.classList.contains('read');
    
    // Toggle class
    item.classList.toggle('read');
    item.classList.toggle('unread');
    
    // Update button
    const button = item.querySelector('.notification-mark-read');
    button.innerHTML = `<i class="fas ${isRead ? 'fa-envelope-open' : 'fa-envelope'}"></i>`;
    button.title = `Mark as ${isRead ? 'read' : 'unread'}`;
    
    // Update counter
    const notificationCount = document.querySelector('.notification-count');
    let count = parseInt(notificationCount.textContent);
    
    if (isRead) {
        count += 1;
    } else {
        count -= 1;
    }
    
    notificationCount.textContent = count;
    notificationCount.style.display = count > 0 ? 'flex' : 'none';
}

/**
 * Mark all notifications as read
 */
function markNotificationsAsRead() {
    // In a real app, this would call an API
    // For this demo, we'll just update the UI
    
    document.querySelectorAll('.notification-item.unread').forEach(item => {
        item.classList.remove('unread');
        item.classList.add('read');
        
        const button = item.querySelector('.notification-mark-read');
        button.innerHTML = '<i class="fas fa-envelope"></i>';
        button.title = 'Mark as unread';
    });
    
    // Update counter
    const notificationCount = document.querySelector('.notification-count');
    if (notificationCount) {
        notificationCount.textContent = '0';
        notificationCount.style.display = 'none';
    }
}

/**
 * Show a notification to the user
 * @param {string} message - Notification message
 * @param {string} type - Notification type (success, error, info, warning)
 * @param {number} duration - Duration in milliseconds, 0 for persistent
 */
function showNotification(message, type = 'info', duration = 5000) {
    // Create notification container if it doesn't exist
    let container = document.querySelector('.notification-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'notification-container';
        document.body.appendChild(container);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    
    // Determine icon based on type
    let icon = 'fa-info-circle';
    switch (type) {
        case 'success':
            icon = 'fa-check-circle';
            break;
        case 'error':
            icon = 'fa-exclamation-circle';
            break;
        case 'warning':
            icon = 'fa-exclamation-triangle';
            break;
    }
    
    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fas ${icon}"></i>
        </div>
        <div class="notification-content">${message}</div>
        <button class="notification-close"><i class="fas fa-times"></i></button>
    `;
    
    // Add to container
    container.appendChild(notification);
    
    // Show notification (transition effect)
    setTimeout(() => notification.classList.add('show'), 10);
    
    // Close button
    notification.querySelector('.notification-close').addEventListener('click', function() {
        closeNotification(notification);
    });
    
    // Auto-close after duration (if not persistent)
    if (duration > 0) {
        setTimeout(() => closeNotification(notification), duration);
    }
}

/**
 * Close a notification
 * @param {HTMLElement} notification - Notification element to close
 */
function closeNotification(notification) {
    notification.classList.remove('show');
    
    // Remove after animation completes
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
            
            // Remove container if it's empty
            const container = document.querySelector('.notification-container');
            if (container && !container.hasChildNodes()) {
                document.body.removeChild(container);
            }
        }
    }, 300);
}

/**
 * Initialize general admin UI features
 */
function initAdminUI() {
    // Initialize color theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        // Check for saved theme preference
        const currentTheme = localStorage.getItem('admin_theme') || 'light';
        if (currentTheme === 'dark') {
            document.body.classList.add('dark-theme');
            themeToggle.checked = true;
        }
        
        // Toggle theme on change
        themeToggle.addEventListener('change', function() {
            document.body.classList.toggle('dark-theme');
            localStorage.setItem('admin_theme', 
                document.body.classList.contains('dark-theme') ? 'dark' : 'light'
            );
        });
    }
    
    // Initialize tooltips
    document.querySelectorAll('[data-tooltip]').forEach(element => {
        element.addEventListener('mouseenter', function() {
            const tooltip = document.createElement('div');
            tooltip.className = 'tooltip';
            tooltip.textContent = this.getAttribute('data-tooltip');
            
            document.body.appendChild(tooltip);
            
            const rect = this.getBoundingClientRect();
            tooltip.style.top = `${rect.bottom + window.scrollY + 10}px`;
            tooltip.style.left = `${rect.left + window.scrollX + (rect.width / 2) - (tooltip.offsetWidth / 2)}px`;
            
            this.addEventListener('mouseleave', function() {
                document.body.removeChild(tooltip);
            }, { once: true });
        });
    });
    
    // Initialize collapsible panels
    document.querySelectorAll('.panel-header').forEach(header => {
        const panel = header.closest('.admin-panel');
        if (!panel) return;
        
        if (panel.classList.contains('collapsible')) {
            header.addEventListener('click', function() {
                panel.classList.toggle('collapsed');
                
                // Save state in localStorage if panel has ID
                const panelId = panel.id;
                if (panelId) {
                    localStorage.setItem(
                        `admin_panel_${panelId}_collapsed`, 
                        panel.classList.contains('collapsed')
                    );
                }
            });
            
            // Check for saved state
            const panelId = panel.id;
            if (panelId) {
                const collapsed = localStorage.getItem(`admin_panel_${panelId}_collapsed`);
                if (collapsed === 'true') {
                    panel.classList.add('collapsed');
                }
            }
        }
    });
    
    // Initialize modal dialogs
    document.querySelectorAll('[data-modal]').forEach(button => {
        button.addEventListener('click', function(e) {
            e.preventDefault();
            
            const modalId = this.getAttribute('data-modal');
            const modal = document.getElementById(modalId);
            
            if (modal) {
                openModal(modal);
            }
        });
    });
    
    document.querySelectorAll('.modal .modal-close, .modal .modal-cancel').forEach(button => {
        button.addEventListener('click', function() {
            const modal = this.closest('.modal');
            closeModal(modal);
        });
    });
    
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                closeModal(modal);
            }
        });
    });
}

/**
 * Open a modal dialog
 * @param {HTMLElement} modal - Modal element to open
 */
function openModal(modal) {
    modal.classList.add('active');
    document.body.classList.add('modal-open');
    
    const focusableElements = modal.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
    if (focusableElements.length > 0) {
        focusableElements[0].focus();
    }
}

/**
 * Close a modal dialog
 * @param {HTMLElement} modal - Modal element to close
 */
function closeModal(modal) {
    modal.classList.remove('active');
    document.body.classList.remove('modal-open');
}

/**
 * Set up global event listeners
 */
function setupEventListeners() {
    // Close dropdown menus when clicking outside
    document.addEventListener('click', function(e) {
        const dropdowns = document.querySelectorAll('.dropdown.open');
        dropdowns.forEach(dropdown => {
            if (!dropdown.contains(e.target)) {
                dropdown.classList.remove('open');
            }
        });
    });
    
    // Toggle dropdown menus
    document.querySelectorAll('.dropdown-toggle').forEach(toggle => {
        toggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            const dropdown = this.closest('.dropdown');
            dropdown.classList.toggle('open');
        });
    });
    
    // Handle logout button
    const logoutBtn = document.getElementById('logout-button');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Show confirmation dialog
            const confirmModal = document.getElementById('logout-confirm-modal');
            if (confirmModal) {
                openModal(confirmModal);
                
                // Set up confirm button
                const confirmBtn = confirmModal.querySelector('.confirm-logout');
                if (confirmBtn) {
                    // Remove existing listeners
                    const newConfirmBtn = confirmBtn.cloneNode(true);
                    confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
                    
                    // Add new click listener
                    newConfirmBtn.addEventListener('click', function() {
                        Auth.logout();
                    });
                }
            } else {
                // No modal, just logout
                Auth.logout();
            }
        });
    }
}

/**
 * Update UI with current user info
 */
function updateUserInfo() {
    const user = Auth.getCurrentUser();
    if (!user) return;
    
    // Update user name
    const userNameElements = document.querySelectorAll('.user-name');
    userNameElements.forEach(el => {
        el.textContent = user.name || user.username;
    });
    
    // Update user role
    const userRoleElements = document.querySelectorAll('.user-role');
    userRoleElements.forEach(el => {
        el.textContent = user.role || 'Administrator';
    });
    
    // Update user avatar
    const userAvatarElements = document.querySelectorAll('.user-avatar');
    userAvatarElements.forEach(el => {
        if (user.avatar) {
            el.src = user.avatar;
            el.alt = user.name || user.username;
        }
    });
}