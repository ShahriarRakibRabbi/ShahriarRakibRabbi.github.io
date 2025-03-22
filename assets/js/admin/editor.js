/**
 * Admin Panel Content Editor
 * Author: Md. Shahriar Rakib Rabbi
 * 
 * This file handles content editing functionality for the portfolio admin panel
 * including form management, validation, and CRUD operations.
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize editors based on current page
    initEditors();
});

/**
 * Initialize appropriate editors based on current page
 */
function initEditors() {
    // Check for specific editor pages
    if (document.getElementById('projects-editor')) {
        initProjectsEditor();
    }
    
    if (document.getElementById('skills-editor')) {
        initSkillsEditor();
    }
    
    if (document.getElementById('achievements-editor')) {
        initAchievementsEditor();
    }
    
    if (document.getElementById('gallery-editor')) {
        initGalleryEditor();
    }
    
    if (document.getElementById('testimonials-editor')) {
        initTestimonialsEditor();
    }
    
    // Initialize rich text editors
    initRichTextEditors();
    
    // Initialize common editor features
    initImageUploads();
    initFormValidation();
    initEditorSettings();
}

/**
 * Initialize projects editor
 */
function initProjectsEditor() {
    loadData('data/projects.json')
        .then(projects => {
            renderProjectsList(projects);
            setupProjectForm(projects);
        })
        .catch(error => {
            console.error('Failed to load projects:', error);
            showNotification('Failed to load projects data', 'error');
        });
}

/**
 * Render projects list in the admin panel
 * @param {Array} projects - Array of project objects
 */
function renderProjectsList(projects) {
    const projectsList = document.getElementById('projects-list');
    if (!projectsList) return;
    
    // Clear existing list
    projectsList.innerHTML = '';
    
    if (projects.length === 0) {
        projectsList.innerHTML = '<div class="empty-state">No projects found. Create your first project using the form.</div>';
        return;
    }
    
    // Create table
    const table = document.createElement('table');
    table.className = 'admin-table projects-table';
    table.innerHTML = `
        <thead>
            <tr>
                <th class="item-image">Image</th>
                <th class="item-title">Title</th>
                <th class="item-category">Category</th>
                <th class="item-featured">Featured</th>
                <th class="item-actions">Actions</th>
            </tr>
        </thead>
        <tbody></tbody>
    `;
    
    const tbody = table.querySelector('tbody');
    
    // Add projects to table
    projects.forEach((project, index) => {
        const tr = document.createElement('tr');
        tr.dataset.id = index;
        
        // Create image thumbnail or placeholder
        const imageUrl = project.imageUrl || 'assets/images/placeholder.jpg';
        const featuredBadge = project.featured ? '<span class="badge badge-success">Featured</span>' : '';
        const categoryLabel = project.categories && project.categories.length > 0 ? project.categories[0] : 'Uncategorized';
        
        tr.innerHTML = `
            <td class="item-image">
                <img src="${imageUrl}" alt="${project.title}" class="thumbnail">
            </td>
            <td class="item-title">
                <strong>${project.title}</strong>
                <div class="item-description">${truncateText(project.description, 60)}</div>
            </td>
            <td class="item-category">${categoryLabel}</td>
            <td class="item-featured">${featuredBadge}</td>
            <td class="item-actions">
                <button class="btn btn-sm btn-primary edit-project" data-id="${index}" title="Edit">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-danger delete-project" data-id="${index}" title="Delete">
                    <i class="fas fa-trash-alt"></i>
                </button>
            </td>
        `;
        
        tbody.appendChild(tr);
    });
    
    projectsList.appendChild(table);
    
    // Add event listeners for action buttons
    addProjectActionListeners(projects);
}

/**
 * Add event listeners to project action buttons
 * @param {Array} projects - Array of project objects
 */
function addProjectActionListeners(projects) {
    // Edit project buttons
    document.querySelectorAll('.edit-project').forEach(button => {
        button.addEventListener('click', function() {
            const projectId = parseInt(this.getAttribute('data-id'));
            editProject(projects[projectId], projectId);
        });
    });
    
    // Delete project buttons
    document.querySelectorAll('.delete-project').forEach(button => {
        button.addEventListener('click', function() {
            const projectId = parseInt(this.getAttribute('data-id'));
            deleteProject(projects, projectId);
        });
    });
}

/**
 * Edit a project
 * @param {Object} project - Project object to edit
 * @param {number} projectId - Project ID/index
 */
function editProject(project, projectId) {
    // Get form and form elements
    const form = document.getElementById('project-form');
    if (!form) return;
    
    // Set form mode to edit
    form.setAttribute('data-mode', 'edit');
    form.setAttribute('data-id', projectId);
    
    // Show form container
    const formContainer = document.getElementById('project-form-container');
    if (formContainer) {
        formContainer.classList.remove('hidden');
    }
    
    // Set form heading
    const formHeading = document.getElementById('project-form-heading');
    if (formHeading) {
        formHeading.textContent = 'Edit Project';
    }
    
    // Populate form fields
    document.getElementById('project-title').value = project.title || '';
    document.getElementById('project-description').value = project.description || '';
    document.getElementById('project-image').value = project.imageUrl || '';
    document.getElementById('project-categories').value = project.categories ? project.categories.join(', ') : '';
    document.getElementById('project-technologies').value = project.technologies ? project.technologies.join(', ') : '';
    document.getElementById('project-demo-url').value = project.demoUrl || '';
    document.getElementById('project-code-url').value = project.codeUrl || '';
    document.getElementById('project-featured').checked = project.featured || false;
    
    // Update image preview
    const imagePreview = document.getElementById('project-image-preview');
    if (imagePreview) {
        imagePreview.src = project.imageUrl || 'assets/images/placeholder.jpg';
    }
    
    // Scroll to form
    formContainer.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Set up the project form
 * @param {Array} projects - Array of project objects
 */
function setupProjectForm(projects) {
    const form = document.getElementById('project-form');
    if (!form) return;
    
    // Add new project button
    const addNewBtn = document.getElementById('add-new-project');
    if (addNewBtn) {
        addNewBtn.addEventListener('click', function() {
            resetProjectForm();
            
            // Show form container
            const formContainer = document.getElementById('project-form-container');
            if (formContainer) {
                formContainer.classList.remove('hidden');
            }
            
            // Set form heading
            const formHeading = document.getElementById('project-form-heading');
            if (formHeading) {
                formHeading.textContent = 'Add New Project';
            }
            
            // Set form mode to create
            form.setAttribute('data-mode', 'create');
            form.removeAttribute('data-id');
            
            // Focus first field
            const firstInput = form.querySelector('input:not([type="hidden"])');
            if (firstInput) {
                firstInput.focus();
            }
        });
    }
    
    // Cancel button
    const cancelBtn = document.getElementById('cancel-project');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            const formContainer = document.getElementById('project-form-container');
            if (formContainer) {
                formContainer.classList.add('hidden');
            }
        });
    }
    
    // Handle form submission
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Basic validation
        const title = document.getElementById('project-title').value.trim();
        if (!title) {
            showNotification('Project title is required', 'error');
            return;
        }
        
        // Get form data
        const projectData = {
            title: title,
            description: document.getElementById('project-description').value.trim(),
            imageUrl: document.getElementById('project-image').value.trim(),
            categories: document.getElementById('project-categories').value.split(',').map(item => item.trim()).filter(item => item),
            technologies: document.getElementById('project-technologies').value.split(',').map(item => item.trim()).filter(item => item),
            demoUrl: document.getElementById('project-demo-url').value.trim(),
            codeUrl: document.getElementById('project-code-url').value.trim(),
            featured: document.getElementById('project-featured').checked
        };
        
        // Get form mode and ID
        const mode = this.getAttribute('data-mode') || 'create';
        const projectId = this.hasAttribute('data-id') ? parseInt(this.getAttribute('data-id')) : -1;
        
        // Show loading state
        const submitBtn = document.getElementById('save-project');
        const originalBtnText = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> Saving...';
        
        // Update or create project
        if (mode === 'edit' && projectId >= 0) {
            // Update existing project
            projects[projectId] = { ...projects[projectId], ...projectData };
        } else {
            // Add new project
            projects.push(projectData);
        }
        
        // Save to data file
        saveData('data/projects.json', projects)
            .then(() => {
                // Show success message
                showNotification(
                    mode === 'edit' 
                        ? `Project "${projectData.title}" updated successfully` 
                        : `Project "${projectData.title}" created successfully`, 
                    'success'
                );
                
                // Reset form and hide it
                resetProjectForm();
                const formContainer = document.getElementById('project-form-container');
                if (formContainer) {
                    formContainer.classList.add('hidden');
                }
                
                // Refresh projects list
                renderProjectsList(projects);
            })
            .catch(error => {
                console.error('Failed to save project:', error);
                showNotification('Failed to save project', 'error');
            })
            .finally(() => {
                // Reset button
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            });
    });
    
    // Set up image preview
    const imageInput = document.getElementById('project-image');
    const imagePreview = document.getElementById('project-image-preview');
    if (imageInput && imagePreview) {
        imageInput.addEventListener('input', function() {
            imagePreview.src = this.value || 'assets/images/placeholder.jpg';
        });
    }
}

/**
 * Reset the project form
 */
function resetProjectForm() {
    const form = document.getElementById('project-form');
    if (!form) return;
    
    // Reset form
    form.reset();
    
    // Reset image preview
    const imagePreview = document.getElementById('project-image-preview');
    if (imagePreview) {
        imagePreview.src = 'assets/images/placeholder.jpg';
    }
    
    // Clear error messages
    form.querySelectorAll('.form-error').forEach(error => error.remove());
    form.querySelectorAll('.is-invalid').forEach(field => field.classList.remove('is-invalid'));
}

/**
 * Delete a project
 * @param {Array} projects - Array of project objects
 * @param {number} projectId - Project ID/index to delete
 */
function deleteProject(projects, projectId) {
    if (projectId < 0 || projectId >= projects.length) return;
    
    const project = projects[projectId];
    
    // Show confirmation dialog
    const confirmModal = document.getElementById('confirm-delete-modal') || createConfirmDeleteModal();
    
    // Update modal content
    const modalTitle = confirmModal.querySelector('.modal-title');
    const modalBody = confirmModal.querySelector('.modal-body');
    
    if (modalTitle) {
        modalTitle.textContent = 'Delete Project';
    }
    
    if (modalBody) {
        modalBody.innerHTML = `
            <p>Are you sure you want to delete the project "${project.title}"?</p>
            <p>This action cannot be undone.</p>
        `;
    }
    
    // Show modal
    openModal(confirmModal);
    
    // Set up confirm button
    const confirmBtn = confirmModal.querySelector('.confirm-delete');
    if (confirmBtn) {
        // Remove existing listeners
        const newConfirmBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
        
        // Add new click listener
        newConfirmBtn.addEventListener('click', function() {
            // Remove project from array
            projects.splice(projectId, 1);
            
            // Save to data file
            saveData('data/projects.json', projects)
                .then(() => {
                    // Show success message
                    showNotification(`Project "${project.title}" deleted successfully`, 'success');
                    
                    // Refresh projects list
                    renderProjectsList(projects);
                    
                    // Close modal
                    closeModal(confirmModal);
                })
                .catch(error => {
                    console.error('Failed to delete project:', error);
                    showNotification('Failed to delete project', 'error');
                });
        });
    }
}

/**
 * Create confirmation modal for delete operations
 * @returns {HTMLElement} The modal element
 */
function createConfirmDeleteModal() {
    const modal = document.createElement('div');
    modal.id = 'confirm-delete-modal';
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.innerHTML = `
        <div class="modal-dialog">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Confirm Delete</h5>
                    <button type="button" class="modal-close" aria-label="Close">&times;</button>
                </div>
                <div class="modal-body">
                    <p>Are you sure you want to delete this item?</p>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary modal-cancel">Cancel</button>
                    <button type="button" class="btn btn-danger confirm-delete">Delete</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Add event listeners
    modal.querySelector('.modal-close').addEventListener('click', () => closeModal(modal));
    modal.querySelector('.modal-cancel').addEventListener('click', () => closeModal(modal));
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            closeModal(modal);
        }
    });
    
    return modal;
}

/**
 * Initialize skills editor
 */
function initSkillsEditor() {
    loadData('data/skills.json')
        .then(skills => {
            renderSkillsList(skills);
            setupSkillForm(skills);
        })
        .catch(error => {
            console.error('Failed to load skills:', error);
            showNotification('Failed to load skills data', 'error');
        });
}

/**
 * Initialize achievements editor
 */
function initAchievementsEditor() {
    loadData('data/achievements.json')
        .then(achievements => {
            renderAchievementsList(achievements);
            setupAchievementForm(achievements);
        })
        .catch(error => {
            console.error('Failed to load achievements:', error);
            showNotification('Failed to load achievements data', 'error');
        });
}

/**
 * Initialize testimonials editor
 */
function initTestimonialsEditor() {
    loadData('data/testimonials.json')
        .then(testimonials => {
            renderTestimonialsList(testimonials);
            setupTestimonialForm(testimonials);
        })
        .catch(error => {
            console.error('Failed to load testimonials:', error);
            showNotification('Failed to load testimonials data', 'error');
        });
}

/**
 * Initialize gallery editor
 */
function initGalleryEditor() {
    loadData('data/gallery.json')
        .then(gallery => {
            renderGalleryList(gallery);
            setupGalleryForm(gallery);
        })
        .catch(error => {
            console.error('Failed to load gallery:', error);
            showNotification('Failed to load gallery data', 'error');
        });
}

/**
 * Initialize rich text editors for textareas with data-rich-editor attribute
 */
function initRichTextEditors() {
    const richEditors = document.querySelectorAll('textarea[data-rich-editor]');
    
    richEditors.forEach(textarea => {
        // Create toolbar
        const toolbar = document.createElement('div');
        toolbar.className = 'rich-editor-toolbar';
        toolbar.innerHTML = `
            <button type="button" data-command="bold" title="Bold"><i class="fas fa-bold"></i></button>
            <button type="button" data-command="italic" title="Italic"><i class="fas fa-italic"></i></button>
            <button type="button" data-command="underline" title="Underline"><i class="fas fa-underline"></i></button>
            <span class="separator"></span>
            <button type="button" data-command="insertUnorderedList" title="Bullet List"><i class="fas fa-list-ul"></i></button>
            <button type="button" data-command="insertOrderedList" title="Numbered List"><i class="fas fa-list-ol"></i></button>
            <span class="separator"></span>
            <button type="button" data-command="createLink" title="Insert Link"><i class="fas fa-link"></i></button>
            <button type="button" data-command="unlink" title="Remove Link"><i class="fas fa-unlink"></i></button>
        `;
        
        // Create editor container
        const container = document.createElement('div');
        container.className = 'rich-editor-container';
        
        // Create editor element
        const editor = document.createElement('div');
        editor.className = 'rich-editor';
        editor.contentEditable = true;
        editor.innerHTML = textarea.value;
        
        // Insert elements
        textarea.parentNode.insertBefore(container, textarea);
        container.appendChild(toolbar);
        container.appendChild(editor);
        
        // Hide original textarea
        textarea.style.display = 'none';
        
        // Sync editor content with textarea
        editor.addEventListener('input', function() {
            textarea.value = this.innerHTML;
        });
        
        // Toolbar button functionality
        toolbar.querySelectorAll('button').forEach(button => {
            button.addEventListener('click', function(e) {
                e.preventDefault();
                
                const command = this.getAttribute('data-command');
                
                if (command === 'createLink') {
                    const url = prompt('Enter URL:');
                    if (url) document.execCommand(command, false, url);
                } else {
                    document.execCommand(command, false, null);
                }
                
                editor.focus();
            });
        });
        
        // Handle form submission
        editor.closest('form')?.addEventListener('submit', function() {
            textarea.value = editor.innerHTML;
        });
    });
}

/**
 * Initialize image upload functionality
 */
function initImageUploads() {
    const imageUploads = document.querySelectorAll('.image-upload');
    
    imageUploads.forEach(upload => {
        const input = upload.querySelector('input[type="file"]');
        const preview = upload.querySelector('.image-preview');
        const urlInput = document.getElementById(upload.getAttribute('data-url-field'));
        
        if (!input || !preview || !urlInput) return;
        
        // Show preview on URL change
        urlInput.addEventListener('input', function() {
            preview.src = this.value || 'assets/images/placeholder.jpg';
        });
        
        // Handle file selection
        input.addEventListener('change', function(e) {
            if (!this.files || !this.files[0]) return;
            
            const file = this.files[0];
            
            // In a real application, this would upload to a server
            // For this demo, we'll generate a data URL
            const reader = new FileReader();
            reader.onload = function(e) {
                const dataUrl = e.target.result;
                preview.src = dataUrl;
                urlInput.value = dataUrl;
            };
            reader.readAsDataURL(file);
        });
        
        // Handle drag and drop
        upload.addEventListener('dragover', function(e) {
            e.preventDefault();
            upload.classList.add('dragover');
        });
        
        upload.addEventListener('dragleave', function() {
            upload.classList.remove('dragover');
        });
        
        upload.addEventListener('drop', function(e) {
            e.preventDefault();
            upload.classList.remove('dragover');
            
            if (!e.dataTransfer.files || !e.dataTransfer.files[0]) return;
            
            input.files = e.dataTransfer.files;
            
            // Trigger change event
            const changeEvent = new Event('change', { bubbles: true });
            input.dispatchEvent(changeEvent);
        });
    });
}

/**
 * Initialize form validation
 */
function initFormValidation() {
    const forms = document.querySelectorAll('form[data-validate="true"]');
    
    forms.forEach(form => {
        const requiredFields = form.querySelectorAll('[required]');
        
        requiredFields.forEach(field => {
            // Add blur event listener
            field.addEventListener('blur', function() {
                validateField(field);
            });
            
            // Add input event listener to clear error on input
            field.addEventListener('input', function() {
                const errorElement = field.parentNode.querySelector('.form-error');
                if (errorElement) {
                    errorElement.remove();
                }
                field.classList.remove('is-invalid');
            });
        });
        
        // Add submit event listener
        form.addEventListener('submit', function(e) {
            let isValid = true;
            
            // Validate all required fields
            requiredFields.forEach(field => {
                if (!validateField(field)) {
                    isValid = false;
                }
            });
            
            // Prevent submission if invalid
            if (!isValid) {
                e.preventDefault();
                
                // Focus first invalid field
                const firstInvalid = form.querySelector('.is-invalid');
                if (firstInvalid) {
                    firstInvalid.focus();
                }
            }
        });
    });
}

/**
 * Validate a form field
 * @param {HTMLElement} field - Field to validate
 * @returns {boolean} Validation result
 */
function validateField(field) {
    // Remove existing error
    const errorElement = field.parentNode.querySelector('.form-error');
    if (errorElement) {
        errorElement.remove();
    }
    
    field.classList.remove('is-invalid');
    
    // Check if empty
    if (field.hasAttribute('required') && !field.value.trim()) {
        showFieldError(field, 'This field is required');
        return false;
    }
    
    // Email validation
    if (field.type === 'email' && field.value.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(field.value)) {
            showFieldError(field, 'Please enter a valid email address');
            return false;
        }
    }
    
    // URL validation
    if (field.type === 'url' && field.value.trim()) {
        try {
            new URL(field.value);
        } catch (e) {
            showFieldError(field, 'Please enter a valid URL');
            return false;
        }
    }
    
    // Min length validation
    const minLength = field.getAttribute('minlength');
    if (minLength && field.value.length < parseInt(minLength)) {
        showFieldError(field, `Must be at least ${minLength} characters`);
        return false;
    }
    
    // Max length validation
    const maxLength = field.getAttribute('maxlength');
    if (maxLength && field.value.length > parseInt(maxLength)) {
        showFieldError(field, `Cannot exceed ${maxLength} characters`);
        return false;
    }
    
    // Pattern validation
    const pattern = field.getAttribute('pattern');
    if (pattern && field.value.trim()) {
        const regex = new RegExp(pattern);
        if (!regex.test(field.value)) {
            showFieldError(field, field.getAttribute('data-pattern-message') || 'Please match the requested format');
            return false;
        }
    }
    
    return true;
}

/**
 * Show error message for a form field
 * @param {HTMLElement} field - Field with error
 * @param {string} message - Error message
 */
function showFieldError(field, message) {
    // Add error class to field
    field.classList.add('is-invalid');
    
    // Create error message element
    const errorElement = document.createElement('div');
    errorElement.className = 'form-error';
    errorElement.textContent = message;
    
    // Add error message after field
    field.parentNode.appendChild(errorElement);
}

/**
 * Initialize editor settings
 */
function initEditorSettings() {
    // Auto-save functionality for forms
    document.querySelectorAll('form[data-autosave="true"]').forEach(form => {
        let autoSaveTimer;
        const autoSaveDelay = parseInt(form.getAttribute('data-autosave-delay') || '30000');
        const formId = form.id || 'form';
        
        // Check for saved draft
        const savedDraft = localStorage.getItem(`autosave_${formId}`);
        if (savedDraft) {
            const draftTime = localStorage.getItem(`autosave_${formId}_time`);
            const formattedTime = draftTime ? new Date(parseInt(draftTime)).toLocaleString() : 'unknown time';
            
            // Show restore notification
            showNotification(`A draft saved at ${formattedTime} is available. <button id="restore-draft" class="btn btn-link">Restore</button>`, 'info', 0);
            
            // Add restore button handler
            document.getElementById('restore-draft')?.addEventListener('click', function() {
                try {
                    const draftData = JSON.parse(savedDraft);
                    
                    // Restore form fields
                    Object.keys(draftData).forEach(fieldId => {
                        const field = document.getElementById(fieldId);
                        if (field) {
                            if (field.type === 'checkbox') {
                                field.checked = draftData[fieldId];
                            } else {
                                field.value = draftData[fieldId];
                                // Trigger change event for fields that need it
                                if (field.matches('[data-url-field]') || field.classList.contains('image-input')) {
                                    const event = new Event('input');
                                    field.dispatchEvent(event);
                                }
                            }
                        }
                    });
                    
                    showNotification('Draft restored successfully', 'success');
                } catch (error) {
                    console.error('Failed to restore draft:', error);
                    showNotification('Failed to restore draft', 'error');
                }
                
                // Close notification
                const notification = this.closest('.notification');
                if (notification) {
                    const closeBtn = notification.querySelector('.notification-close');
                    if (closeBtn) closeBtn.click();
                }
            });
        }
        
        // Set up auto-save on field changes
        form.querySelectorAll('input, textarea, select').forEach(field => {
            field.addEventListener('input', function() {
                clearTimeout(autoSaveTimer);
                autoSaveTimer = setTimeout(() => saveFormDraft(form), autoSaveDelay);
            });
        });
        
        // Clear saved draft on successful submission
        form.addEventListener('submit', function() {
            localStorage.removeItem(`autosave_${formId}`);
            localStorage.removeItem(`autosave_${formId}_time`);
        });
    });
}

/**
 * Save form draft to localStorage
 * @param {HTMLFormElement} form - Form to save
 */
function saveFormDraft(form) {
    const formId = form.id || 'form';
    const formData = {};
    
    // Collect form field values
    form.querySelectorAll('input, textarea, select').forEach(field => {
        if (field.id) {
            formData[field.id] = field.type === 'checkbox' ? field.checked : field.value;
        }
    });
    
    // Save to localStorage
    try {
        localStorage.setItem(`autosave_${formId}`, JSON.stringify(formData));
        localStorage.setItem(`autosave_${formId}_time`, Date.now().toString());
        
        // Show success message
        showNotification('Draft saved automatically', 'success', 3000);
    } catch (error) {
        console.error('Failed to save form draft:', error);
    }
}

/**
 * Truncate text to a specified length
 * @param {string} text - Text to truncate
 * @param {number} maxLength - Maximum length
 * @returns {string} Truncated text
 */
function truncateText(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}