/*
* Portfolio Website - Main JavaScript
* Author: Md. Shahriar Rakib Rabbi
* Version: 1.0
*/

document.addEventListener('DOMContentLoaded', function() {
    'use strict';

    // Variables for DOM elements
    const body = document.body;
    const header = document.querySelector('.site-header');
    const menuToggle = document.querySelector('.menu-toggle');
    const navMenu = document.querySelector('.nav-menu');
    const backToTopButton = document.getElementById('back-to-top');
    const themeToggle = document.getElementById('theme-toggle');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const projectsGrid = document.getElementById('projects-grid');
    const testimonialsCarousel = document.getElementById('testimonials-carousel');
    const contactForm = document.getElementById('contact-form');
    const themePreference = localStorage.getItem('theme');
    const currentYearElements = document.querySelectorAll('#current-year');

    // Initialize theme based on user preference
    initTheme();

    // Update current year in footer
    updateCurrentYear();

    // Event Listeners
    if (menuToggle) {
        menuToggle.addEventListener('click', toggleMenu);
    }

    if (backToTopButton) {
        backToTopButton.addEventListener('click', scrollToTop);
        window.addEventListener('scroll', toggleBackToTopButton);
    }

    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }

    if (filterButtons) {
        filterButtons.forEach(button => {
            button.addEventListener('click', filterProjects);
        });
    }

    if (contactForm) {
        contactForm.addEventListener('submit', handleContactFormSubmit);
    }

    // Load dynamic content
    loadProjects();
    loadTestimonials();
    initAnimations();
    initTypingEffect();
    handleNavLinks();

    /**
     * Initialize the theme based on user preference or system preference
     */
    function initTheme() {
        if (themePreference === 'dark') {
            document.documentElement.classList.add('dark-mode');
        } else if (themePreference === 'light') {
            document.documentElement.classList.remove('dark-mode');
        } else {
            // Check system preference if user hasn't set a preference
            const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDarkMode) {
                document.documentElement.classList.add('dark-mode');
            }
        }
    }

    /**
     * Toggle the theme between light and dark mode
     */
    function toggleTheme() {
        const isDarkMode = document.documentElement.classList.toggle('dark-mode');
        localStorage.setItem('theme', isDarkMode ? 'dark' : 'light');
        
        // Animate the theme toggle button
        themeToggle.classList.add('theme-toggle-animate');
        setTimeout(() => {
            themeToggle.classList.remove('theme-toggle-animate');
        }, 300);
    }

    /**
     * Toggle mobile menu
     */
    function toggleMenu() {
        menuToggle.classList.toggle('active');
        navMenu.classList.toggle('active');
        
        // Prevent body scrolling when menu is open
        if (navMenu.classList.contains('active')) {
            body.style.overflow = 'hidden';
        } else {
            body.style.overflow = '';
        }
    }

    /**
     * Show/hide back to top button based on scroll position
     */
    function toggleBackToTopButton() {
        if (window.pageYOffset > 300) {
            backToTopButton.classList.add('visible');
        } else {
            backToTopButton.classList.remove('visible');
        }
        
        // Add shadow to header on scroll
        if (window.pageYOffset > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
    }

    /**
     * Scroll to top with smooth animation
     */
    function scrollToTop() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }

    /**
     * Handle navigation links and smooth scrolling
     */
    function handleNavLinks() {
        const navLinks = document.querySelectorAll('a[href^="#"]');
        
        navLinks.forEach(link => {
            link.addEventListener('click', function(e) {
                // Only handle links to elements on this page
                const targetId = this.getAttribute('href');
                if (targetId === '#' || targetId === '') return;
                
                const targetElement = document.querySelector(targetId);
                if (targetElement) {
                    e.preventDefault();
                    
                    // Close mobile menu if open
                    if (navMenu.classList.contains('active')) {
                        toggleMenu();
                    }
                    
                    // Scroll to the target element
                    const headerHeight = header.offsetHeight;
                    const targetPosition = targetElement.offsetTop - headerHeight;
                    
                    window.scrollTo({
                        top: targetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    }

    /**
     * Load projects from JSON data and populate the projects grid
     */
    function loadProjects() {
        if (!projectsGrid) return;
        
        fetch('data/projects.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Clear loading spinner
                projectsGrid.innerHTML = '';
                
                // Get featured projects for homepage, or all projects for projects page
                const isHomepage = document.body.classList.contains('home');
                const projects = isHomepage ? 
                    data.projects.filter(project => project.featured).slice(0, 6) : 
                    data.projects;
                
                // Create project cards
                projects.forEach(project => {
                    const projectCard = createProjectCard(project);
                    projectsGrid.appendChild(projectCard);
                });
                
                // Initialize AOS animations for project cards
                if (typeof AOS !== 'undefined') {
                    AOS.refresh();
                }
            })
            .catch(error => {
                console.error('Error loading projects:', error);
                projectsGrid.innerHTML = '<div class="error-message">Unable to load projects. Please try again later.</div>';
            });
    }

    /**
     * Create a project card element
     * @param {Object} project - The project data
     * @return {HTMLElement} The project card element
     */
    function createProjectCard(project) {
        const card = document.createElement('div');
        card.className = `project-card ${project.categories.map(cat => cat.toLowerCase().replace(/\s+/g, '-')).join(' ')}`;
        
        if (typeof AOS !== 'undefined') {
            card.setAttribute('data-aos', 'fade-up');
            card.setAttribute('data-aos-delay', Math.floor(Math.random() * 300));
        }
        
        card.innerHTML = `
            <div class="project-image-container">
                <img src="${project.thumbnailUrl}" alt="${project.title}" class="project-image">
                ${project.featured ? '<span class="project-featured-badge">Featured</span>' : ''}
            </div>
            <div class="project-content">
                <div class="project-categories">
                    ${project.categories.map(category => `<span class="project-category">${category}</span>`).join('')}
                </div>
                <h3 class="project-title">${project.title}</h3>
                <p class="project-description">${project.description}</p>
                <div class="project-tech">
                    ${project.technologies.map(tech => `<span>${tech}</span>`).join('')}
                </div>
                <div class="project-links">
                    ${project.demoUrl ? `<a href="${project.demoUrl}" class="project-link" target="_blank" rel="noopener noreferrer"><i class="fas fa-external-link-alt"></i> Demo</a>` : ''}
                    ${project.codeUrl ? `<a href="${project.codeUrl}" class="project-link" target="_blank" rel="noopener noreferrer"><i class="fab fa-github"></i> Code</a>` : ''}
                    <a href="project-details.html?id=${project.id}" class="project-link"><i class="fas fa-info-circle"></i> Details</a>
                </div>
            </div>
        `;
        
        return card;
    }

    /**
     * Filter projects based on category
     */
    function filterProjects() {
        const buttons = document.querySelectorAll('.filter-btn');
        const projects = document.querySelectorAll('.project-card');
        
        // Remove active class from all buttons
        buttons.forEach(button => {
            button.classList.remove('active');
        });
        
        // Add active class to clicked button
        this.classList.add('active');
        
        const filter = this.getAttribute('data-filter');
        
        // Show/hide projects based on filter
        projects.forEach(project => {
            if (filter === 'all') {
                project.style.display = 'block';
            } else {
                project.classList.contains(filter) ? 
                    project.style.display = 'block' : 
                    project.style.display = 'none';
            }
        });
    }

    /**
     * Load testimonials from JSON data and populate the testimonials carousel
     */
    function loadTestimonials() {
        if (!testimonialsCarousel) return;
        
        fetch('data/testimonials.json')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                // Clear loading spinner
                testimonialsCarousel.innerHTML = '';
                
                // Get featured testimonials for homepage, or all testimonials for testimonials page
                const isHomepage = document.body.classList.contains('home') || !document.body.classList.contains('testimonials-page');
                const testimonials = isHomepage ? 
                    data.testimonials.filter(testimonial => testimonial.featured).slice(0, 3) : 
                    data.testimonials;
                
                // Create testimonial cards
                testimonials.forEach(testimonial => {
                    const testimonialCard = createTestimonialCard(testimonial);
                    testimonialsCarousel.appendChild(testimonialCard);
                });
                
                // Initialize carousel if multiple testimonials
                if (testimonials.length > 1) {
                    initCarousel(testimonialsCarousel);
                }
            })
            .catch(error => {
                console.error('Error loading testimonials:', error);
                testimonialsCarousel.innerHTML = '<div class="error-message">Unable to load testimonials. Please try again later.</div>';
            });
    }

    /**
     * Create a testimonial card element
     * @param {Object} testimonial - The testimonial data
     * @return {HTMLElement} The testimonial card element
     */
    function createTestimonialCard(testimonial) {
        const card = document.createElement('div');
        card.className = 'testimonial-card';
        
        // Generate star rating
        const stars = Array(5).fill().map((_, i) => {
            return i < testimonial.rating ? 
                '<i class="fas fa-star"></i>' : 
                '<i class="far fa-star"></i>';
        }).join('');
        
        card.innerHTML = `
            <div class="testimonial-header">
                <img src="${testimonial.avatar}" alt="${testimonial.name}" class="testimonial-avatar">
                <div class="testimonial-author">
                    <h3>${testimonial.name}</h3>
                    <p class="testimonial-position">${testimonial.position} at ${testimonial.company}</p>
                </div>
            </div>
            <div class="testimonial-rating">
                ${stars}
            </div>
            <div class="testimonial-content">
                "${testimonial.testimonial}"
            </div>
            <div class="testimonial-project">
                <strong>Project:</strong> ${testimonial.project}
            </div>
        `;
        
        return card;
    }

    /**
     * Initialize carousel for testimonials or any other carousel
     * @param {HTMLElement} carouselElement - The carousel container element
     */
    function initCarousel(carouselElement) {
        const items = carouselElement.querySelectorAll('.testimonial-card');
        if (items.length <= 1) return;
        
        // Create carousel wrapper
        const carouselWrapper = document.createElement('div');
        carouselWrapper.className = 'carousel';
        
        // Create carousel container
        const carouselContainer = document.createElement('div');
        carouselContainer.className = 'carousel-container';
        
        // Wrap each item in carousel item div
        items.forEach(item => {
            const carouselItem = document.createElement('div');
            carouselItem.className = 'carousel-item';
            carouselItem.appendChild(item.cloneNode(true));
            carouselContainer.appendChild(carouselItem);
        });
        
        // Create carousel controls
        const controls = document.createElement('div');
        controls.className = 'carousel-controls';
        controls.innerHTML = `
            <div class="carousel-prev"><i class="fas fa-chevron-left"></i></div>
            <div class="carousel-indicators"></div>
            <div class="carousel-next"><i class="fas fa-chevron-right"></i></div>
        `;
        
        // Create indicators
        const indicators = controls.querySelector('.carousel-indicators');
        for (let i = 0; i < items.length; i++) {
            const dot = document.createElement('div');
            dot.className = 'carousel-indicator';
            if (i === 0) dot.classList.add('active');
            indicators.appendChild(dot);
        }
        
        // Add everything to the carousel wrapper
        carouselWrapper.appendChild(carouselContainer);
        carouselWrapper.appendChild(controls);
        
        // Replace original element with carousel
        carouselElement.innerHTML = '';
        carouselElement.appendChild(carouselWrapper);
        
        // Initialize carousel functionality
        let currentSlide = 0;
        const slideCount = items.length;
        
        // Event listeners for controls
        const prevButton = carouselWrapper.querySelector('.carousel-prev');
        const nextButton = carouselWrapper.querySelector('.carousel-next');
        const dots = carouselWrapper.querySelectorAll('.carousel-indicator');
        
        prevButton.addEventListener('click', () => {
            goToSlide((currentSlide - 1 + slideCount) % slideCount);
        });
        
        nextButton.addEventListener('click', () => {
            goToSlide((currentSlide + 1) % slideCount);
        });
        
        dots.forEach((dot, index) => {
            dot.addEventListener('click', () => {
                goToSlide(index);
            });
        });
        
        function goToSlide(slideIndex) {
            carouselContainer.style.transform = `translateX(-${slideIndex * 100}%)`;
            
            // Update active dot
            dots.forEach(dot => dot.classList.remove('active'));
            dots[slideIndex].classList.add('active');
            
            currentSlide = slideIndex;
        }
        
        // Auto advance slides every 5 seconds
        setInterval(() => {
            goToSlide((currentSlide + 1) % slideCount);
        }, 5000);
    }

    /**
     * Handle contact form submission
     * @param {Event} e - The form submit event
     */
    function handleContactFormSubmit(e) {
        e.preventDefault();
        
        // Get form data
        const formData = new FormData(contactForm);
        const name = formData.get('name');
        const email = formData.get('email');
        const subject = formData.get('subject');
        const message = formData.get('message');
        
        // Simple form validation
        let valid = true;
        const formElements = contactForm.elements;
        
        for (let i = 0; i < formElements.length; i++) {
            const element = formElements[i];
            if (element.type !== 'submit' && !element.value) {
                valid = false;
                element.classList.add('error');
            } else if (element.type !== 'submit') {
                element.classList.remove('error');
            }
        }
        
        if (!valid) {
            alert('Please fill in all fields');
            return;
        }
        
        // Email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            alert('Please enter a valid email address');
            return;
        }
        
        // Disable form while submitting
        Array.from(formElements).forEach(element => {
            element.disabled = true;
        });
        
        // Normally, you would send this data to a server
        // For demo purposes, we'll just simulate a successful submission
        
        setTimeout(() => {
            // Show success message
            const successMessage = document.createElement('div');
            successMessage.className = 'form-success';
            successMessage.innerHTML = 'Thank you for your message! I\'ll get back to you as soon as possible.';
            
            contactForm.parentNode.insertBefore(successMessage, contactForm);
            contactForm.reset();
            
            // Re-enable form
            Array.from(formElements).forEach(element => {
                element.disabled = false;
            });
            
            // Remove success message after 5 seconds
            setTimeout(() => {
                successMessage.style.opacity = '0';
                setTimeout(() => {
                    successMessage.remove();
                }, 300);
            }, 5000);
        }, 1500);
    }

    /**
     * Initialize animations for elements
     */
    function initAnimations() {
        // Animate skill bars
        const skillBars = document.querySelectorAll('.skill-progress');
        
        if (skillBars.length > 0) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const skillBar = entry.target;
                        const width = skillBar.style.width;
                        skillBar.style.width = '0';
                        
                        setTimeout(() => {
                            skillBar.style.width = width;
                        }, 100);
                        
                        observer.unobserve(skillBar);
                    }
                });
            });
            
            skillBars.forEach(skillBar => {
                observer.observe(skillBar);
            });
        }
        
        // Animate statistics counters
        const statNumbers = document.querySelectorAll('.stat-number');
        
        if (statNumbers.length > 0) {
            const observer = new IntersectionObserver(entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const statElement = entry.target;
                        const finalValue = statElement.innerText;
                        
                        animateCounter(statElement, finalValue);
                        observer.unobserve(statElement);
                    }
                });
            });
            
            statNumbers.forEach(stat => {
                observer.observe(stat);
            });
        }
    }

    /**
     * Animate a counter from 0 to target value
     * @param {HTMLElement} element - The element to animate
     * @param {string} finalValue - The final value to count to
     */
    function animateCounter(element, finalValue) {
        const numericValue = parseInt(finalValue);
        let currentValue = 0;
        const duration = 2000; // 2 seconds
        const interval = 50; // Update every 50ms
        const increment = numericValue / (duration / interval);
        
        // Handle values with + sign at the end
        const hasPlus = finalValue.indexOf('+') !== -1;
        
        const timer = setInterval(() => {
            currentValue += increment;
            
            if (currentValue >= numericValue) {
                clearInterval(timer);
                currentValue = numericValue;
            }
            
            element.innerText = Math.floor(currentValue) + (hasPlus ? '+' : '');
        }, interval);
    }

    /**
     * Initialize typing effect for hero subtitle
     */
    function initTypingEffect() {
        const typingElement = document.querySelector('.typing-text');
        if (!typingElement) return;
        
        const roles = [
            'Web Developer',
            'UI/UX Designer',
            'Frontend Engineer',
            'React Specialist',
            'Creative Developer'
        ];
        
        let currentRoleIndex = 0;
        let currentCharIndex = 0;
        let isDeleting = false;
        let typingSpeed = 100;
        
        function typeText() {
            const currentRole = roles[currentRoleIndex];
            
            if (isDeleting) {
                typingElement.textContent = currentRole.substring(0, currentCharIndex - 1);
                currentCharIndex--;
                typingSpeed = 50;
            } else {
                typingElement.textContent = currentRole.substring(0, currentCharIndex + 1);
                currentCharIndex++;
                typingSpeed = 100;
            }
            
            if (!isDeleting && currentCharIndex === currentRole.length) {
                // Pause at the end of typing
                isDeleting = true;
                typingSpeed = 1500;
            } else if (isDeleting && currentCharIndex === 0) {
                // Move to the next role after deleting
                isDeleting = false;
                currentRoleIndex = (currentRoleIndex + 1) % roles.length;
                typingSpeed = 500;
            }
            
            setTimeout(typeText, typingSpeed);
        }
        
        typeText();
    }

    /**
     * Update the current year in the footer
     */
    function updateCurrentYear() {
        if (currentYearElements.length > 0) {
            const currentYear = new Date().getFullYear();
            currentYearElements.forEach(element => {
                element.textContent = currentYear;
            });
        }
    }
});