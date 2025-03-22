/**
 * Admin Editor Module
 * Handles content editing and file uploading functionality
 * @author: Md. Shahriar Rakib Rabbi
 */

const EditorModule = (function() {
    // Private variables
    let currentForm = null;
    let uploadQueue = [];
    let pendingChanges = false;
    let imageCompressor = null;
    let gitHubToken = null;
    let repoInfo = null;

    // Cache DOM elements
    const domElements = {
        forms: document.querySelectorAll('.editor-form'),
        imageUploadInputs: document.querySelectorAll('.image-upload-input'),
        imageContainers: document.querySelectorAll('.image-preview-container'),
        saveButtons: document.querySelectorAll('.save-changes-btn'),
        discardButtons: document.querySelectorAll('.discard-changes-btn'),
        githubTokenInput: document.querySelector('#github-token'),
        githubRepoInput: document.querySelector('#github-repo'),
        githubUsernameInput: document.querySelector('#github-username'),
        commitMsgInput: document.querySelector('#commit-message'),
        pushStatusContainer: document.querySelector('#push-status'),
        progressBars: document.querySelectorAll('.upload-progress')
    };

    /**
     * Initialize the editor module
     */
    function init() {
        loadEditor();
        bindEvents();
        initImageCompressor();
        loadGitHubCredentials();
        
        // Check for unsaved changes before leaving page
        window.addEventListener('beforeunload', function(e) {
            if (pendingChanges) {
                e.preventDefault();
                e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
                return e.returnValue;
            }
        });
    }

    /**
     * Load the editor with existing data
     */
    function loadEditor() {
        const dataType = document.body.dataset.editorType;
        if (!dataType) return;

        // Load data based on editor type
        DataModule.fetchData(`../data/${dataType}.json`)
            .then(data => {
                populateEditor(data);
                console.log(`${dataType} data loaded successfully`);
            })
            .catch(error => {
                NotificationModule.showError(`Error loading data: ${error.message}`);
                console.error('Error loading data:', error);
            });
    }

    /**
     * Populate editor fields with data
     * @param {Object} data - The data to populate the editor with
     */
    function populateEditor(data) {
        const dataType = document.body.dataset.editorType;
        
        switch(dataType) {
            case 'projects':
                populateProjectsEditor(data.projects);
                break;
            case 'skills':
                populateSkillsEditor(data.skills);
                break;
            case 'achievements':
                populateAchievementsEditor(data.achievements);
                break;
            case 'gallery':
                populateGalleryEditor(data.gallery);
                break;
            case 'testimonials':
                populateTestimonialsEditor(data.testimonials);
                break;
            default:
                console.warn('Unknown editor type:', dataType);
        }
    }

    /**
     * Initialize image compression library
     */
    function initImageCompressor() {
        imageCompressor = new ImageCompressor();
    }

    /**
     * Load GitHub credentials from local storage
     */
    function loadGitHubCredentials() {
        const credentials = localStorage.getItem('github_credentials');
        if (credentials) {
            const parsedCredentials = JSON.parse(credentials);
            gitHubToken = parsedCredentials.token;
            repoInfo = {
                username: parsedCredentials.username,
                repo: parsedCredentials.repo
            };
            
            // Populate inputs if they exist
            if (domElements.githubTokenInput) domElements.githubTokenInput.value = gitHubToken;
            if (domElements.githubRepoInput) domElements.githubRepoInput.value = repoInfo.repo;
            if (domElements.githubUsernameInput) domElements.githubUsernameInput.value = repoInfo.username;
        }
    }

    /**
     * Save GitHub credentials to local storage
     */
    function saveGitHubCredentials() {
        if (domElements.githubTokenInput && domElements.githubRepoInput && domElements.githubUsernameInput) {
            gitHubToken = domElements.githubTokenInput.value.trim();
            repoInfo = {
                username: domElements.githubUsernameInput.value.trim(),
                repo: domElements.githubRepoInput.value.trim()
            };
            
            localStorage.setItem('github_credentials', JSON.stringify({
                token: gitHubToken,
                username: repoInfo.username,
                repo: repoInfo.repo
            }));
            
            NotificationModule.showSuccess('GitHub credentials saved');
        }
    }

    /**
     * Bind event listeners
     */
    function bindEvents() {
        // Form submission
        domElements.forms.forEach(form => {
            form.addEventListener('submit', handleFormSubmit);
            
            // Mark form as having pending changes when inputs change
            form.querySelectorAll('input, textarea, select').forEach(input => {
                input.addEventListener('change', () => {
                    pendingChanges = true;
                    highlightSaveButton(form);
                });
                
                if (input.type !== 'file') {
                    input.addEventListener('keyup', () => {
                        pendingChanges = true;
                        highlightSaveButton(form);
                    });
                }
            });
        });

        // Image upload handling
        domElements.imageUploadInputs.forEach(input => {
            input.addEventListener('change', handleImageUpload);
        });

        // Save and discard buttons
        domElements.saveButtons.forEach(button => {
            button.addEventListener('click', function() {
                const form = this.closest('form');
                if (form) form.dispatchEvent(new Event('submit'));
            });
        });

        domElements.discardButtons.forEach(button => {
            button.addEventListener('click', function() {
                const form = this.closest('form');
                if (form) {
                    form.reset();
                    loadEditor(); // Reload the original data
                    pendingChanges = false;
                    resetSaveButton(form);
                    NotificationModule.showInfo('Changes discarded');
                }
            });
        });

        // GitHub credentials form
        const githubForm = document.querySelector('#github-credentials-form');
        if (githubForm) {
            githubForm.addEventListener('submit', function(e) {
                e.preventDefault();
                saveGitHubCredentials();
            });
        }
        
        // Add item buttons (for array-type data)
        const addButtons = document.querySelectorAll('.add-item-btn');
        addButtons.forEach(button => {
            button.addEventListener('click', function() {
                const containerSelector = this.dataset.target;
                const container = document.querySelector(containerSelector);
                if (container) {
                    addNewItem(container);
                }
            });
        });
        
        // Initialize sortable lists for drag-and-drop reordering
        initSortableLists();
    }

    /**
     * Handle form submission
     * @param {Event} e - The form submission event
     */
    function handleFormSubmit(e) {
        e.preventDefault();
        currentForm = e.target;
        
        // Validate form
        if (!validateForm(currentForm)) {
            NotificationModule.showError('Please fill in all required fields');
            return;
        }
        
        // Process uploads first if there are any
        if (uploadQueue.length > 0) {
            processUploads()
                .then(() => {
                    saveFormData();
                })
                .catch(error => {
                    NotificationModule.showError(`Error uploading files: ${error.message}`);
                    console.error('Upload error:', error);
                });
        } else {
            saveFormData();
        }
    }

    /**
     * Process file uploads to GitHub
     * @returns {Promise} A promise that resolves when all uploads are complete
     */
    function processUploads() {
        if (!gitHubToken || !repoInfo) {
            return Promise.reject(new Error('GitHub credentials not set'));
        }
        
        // Show upload progress container
        const progressContainer = currentForm.querySelector('.upload-progress-container');
        if (progressContainer) progressContainer.classList.remove('hidden');
        
        const uploadPromises = uploadQueue.map((upload, index) => {
            return new Promise((resolve, reject) => {
                // Update progress bar
                const progressBar = currentForm.querySelector(`.upload-progress[data-index="${index}"]`);
                if (progressBar) {
                    progressBar.style.width = '10%';
                    progressBar.textContent = 'Preparing...';
                }
                
                // Compress image if it's an image file
                compressImageIfNeeded(upload.file)
                    .then(processedFile => {
                        if (progressBar) {
                            progressBar.style.width = '30%';
                            progressBar.textContent = 'Compressed';
                        }
                        
                        // Convert to base64 for GitHub API
                        return fileToBase64(processedFile);
                    })
                    .then(base64Content => {
                        if (progressBar) {
                            progressBar.style.width = '50%';
                            progressBar.textContent = 'Uploading...';
                        }
                        
                        // Upload to GitHub
                        const fileName = `assets/images/${upload.targetPath}/${Date.now()}-${upload.file.name}`;
                        
                        return GitHubModule.uploadFile({
                            token: gitHubToken,
                            username: repoInfo.username,
                            repo: repoInfo.repo,
                            path: fileName,
                            content: base64Content.split(',')[1], // Remove data URL prefix
                            message: `Upload ${fileName} via admin panel`
                        });
                    })
                    .then(response => {
                        if (progressBar) {
                            progressBar.style.width = '100%';
                            progressBar.textContent = 'Complete';
                        }
                        
                        // Update the file path in the form
                        const targetInput = document.querySelector(`#${upload.targetInput}`);
                        if (targetInput) {
                            targetInput.value = response.content.path;
                        }
                        
                        resolve(response);
                    })
                    .catch(error => {
                        if (progressBar) {
                            progressBar.style.width = '100%';
                            progressBar.classList.add('bg-danger');
                            progressBar.textContent = 'Failed';
                        }
                        reject(error);
                    });
            });
        });
        
        return Promise.all(uploadPromises)
            .then(() => {
                // Clear the upload queue
                uploadQueue = [];
                
                // Hide progress container after a delay
                setTimeout(() => {
                    if (progressContainer) progressContainer.classList.add('hidden');
                }, 1500);
            });
    }

    /**
     * Compress image if it's an image file
     * @param {File} file - The file to potentially compress
     * @returns {Promise<File|Blob>} A promise that resolves with the processed file
     */
    function compressImageIfNeeded(file) {
        if (!file.type.startsWith('image/')) {
            return Promise.resolve(file);
        }
        
        return new Promise((resolve, reject) => {
            imageCompressor.compress(file, {
                quality: 0.8,
                maxWidth: 1920,
                maxHeight: 1080,
                convertSize: 1000000, // Convert to jpg if over 1MB
                success(result) {
                    resolve(result);
                },
                error(e) {
                    console.warn('Image compression failed, using original file', e);
                    resolve(file);
                }
            });
        });
    }

    /**
     * Convert a file to base64
     * @param {File|Blob} file - The file to convert
     * @returns {Promise<string>} A promise that resolves with the base64 string
     */
    function fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    /**
     * Handle image upload via the file input
     * @param {Event} e - The change event from the file input
     */
    function handleImageUpload(e) {
        const input = e.target;
        const file = input.files[0];
        
        if (!file) return;
        
        // Check file size (max 5MB)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            NotificationModule.showError('File is too large. Maximum size is 5MB.');
            input.value = '';
            return;
        }
        
        // Check file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedTypes.includes(file.type)) {
            NotificationModule.showError('Invalid file type. Please upload a JPG, PNG, GIF, or WebP image.');
            input.value = '';
            return;
        }
        
        // Display preview
        const previewContainer = input.closest('.form-group').querySelector('.image-preview');
        if (previewContainer) {
            const reader = new FileReader();
            reader.onload = function(e) {
                previewContainer.innerHTML = `
                    <div class="preview-image-container">
                        <img src="${e.target.result}" alt="Preview" class="preview-image">
                        <button type="button" class="remove-image-btn">×</button>
                    </div>
                `;
                
                // Add event listener to remove button
                const removeButton = previewContainer.querySelector('.remove-image-btn');
                if (removeButton) {
                    removeButton.addEventListener('click', function() {
                        input.value = '';
                        previewContainer.innerHTML = '<div class="no-image">No image selected</div>';
                        
                        // Remove from upload queue
                        const targetInput = input.dataset.target;
                        const targetPath = input.dataset.path;
                        uploadQueue = uploadQueue.filter(item => 
                            item.targetInput !== targetInput || item.targetPath !== targetPath
                        );
                    });
                }
            };
            reader.readAsDataURL(file);
        }
        
        // Add to upload queue
        const targetInput = input.dataset.target;
        const targetPath = input.dataset.path;
        
        // Remove any existing upload with the same target
        uploadQueue = uploadQueue.filter(item => 
            item.targetInput !== targetInput || item.targetPath !== targetPath
        );
        
        // Add new upload
        uploadQueue.push({
            file,
            targetInput,
            targetPath
        });
        
        pendingChanges = true;
        highlightSaveButton(input.closest('form'));
    }

    /**
     * Save form data to the appropriate JSON file
     */
    function saveFormData() {
        const dataType = document.body.dataset.editorType;
        if (!dataType) {
            NotificationModule.showError('Editor type not specified');
            return;
        }
        
        // Extract data from the form
        const formData = extractFormData();
        
        // Prepare data for saving
        let dataToSave;
        switch(dataType) {
            case 'projects':
                dataToSave = { projects: formData };
                break;
            case 'skills':
                dataToSave = { skills: formData };
                break;
            case 'achievements':
                dataToSave = { achievements: formData };
                break;
            case 'gallery':
                dataToSave = { gallery: formData };
                break;
            case 'testimonials':
                dataToSave = { testimonials: formData };
                break;
            default:
                NotificationModule.showError('Unknown data type');
                return;
        }
        
        // Get commit message
        let commitMessage = 'Update via admin panel';
        if (domElements.commitMsgInput && domElements.commitMsgInput.value.trim()) {
            commitMessage = domElements.commitMsgInput.value.trim();
        }
        
        // Show loading indicator
        const saveButton = currentForm.querySelector('.save-changes-btn');
        if (saveButton) {
            saveButton.disabled = true;
            saveButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        }
        
        // Convert data to JSON string with pretty formatting
        const jsonContent = JSON.stringify(dataToSave, null, 2);
        
        // Upload JSON to GitHub
        GitHubModule.uploadFile({
            token: gitHubToken,
            username: repoInfo.username,
            repo: repoInfo.repo,
            path: `data/${dataType}.json`,
            content: btoa(unescape(encodeURIComponent(jsonContent))), // Convert to base64
            message: commitMessage
        })
        .then(response => {
            NotificationModule.showSuccess('Changes saved successfully');
            pendingChanges = false;
            resetSaveButton(currentForm);
            
            // Update the UI to show when the file was last updated
            const lastUpdated = document.querySelector('.last-updated');
            if (lastUpdated) {
                const now = new Date();
                lastUpdated.textContent = `Last updated: ${now.toLocaleString()}`;
            }
            
            console.log('File saved:', response);
        })
        .catch(error => {
            NotificationModule.showError(`Error saving changes: ${error.message}`);
            console.error('Save error:', error);
            
            if (saveButton) {
                saveButton.disabled = false;
                saveButton.innerHTML = '<i class="fas fa-save"></i> Retry Save';
            }
        });
    }

    /**
     * Extract structured data from the form
     * @returns {Array|Object} The extracted form data
     */
    function extractFormData() {
        const dataType = document.body.dataset.editorType;
        let formData;
        
        switch(dataType) {
            case 'projects':
                formData = extractProjectsData();
                break;
            case 'skills':
                formData = extractSkillsData();
                break;
            case 'achievements':
                formData = extractAchievementsData();
                break;
            case 'gallery':
                formData = extractGalleryData();
                break;
            case 'testimonials':
                formData = extractTestimonialsData();
                break;
            default:
                console.warn('Unknown data type for extraction:', dataType);
                formData = {};
        }
        
        return formData;
    }

    /**
     * Initialize sortable lists for drag-and-drop reordering
     */
    function initSortableLists() {
        const sortableLists = document.querySelectorAll('.sortable-list');
        
        sortableLists.forEach(list => {
            new Sortable(list, {
                animation: 150,
                handle: '.drag-handle',
                ghostClass: 'sortable-ghost',
                onEnd: function() {
                    pendingChanges = true;
                    highlightSaveButton(list.closest('form'));
                }
            });
        });
    }

    /**
     * Add a new item to a list (for array-type data)
     * @param {HTMLElement} container - The container to add the item to
     */
    function addNewItem(container) {
        const dataType = document.body.dataset.editorType;
        const template = document.querySelector(`#${dataType}-item-template`);
        
        if (!template) {
            console.error('Template not found for', dataType);
            return;
        }
        
        // Clone the template
        const clone = document.importNode(template.content, true);
        
        // Generate a unique ID for the new item
        const itemId = `new-${Date.now()}`;
        const itemElements = clone.querySelectorAll('[id], [for], [data-target], [name]');
        
        itemElements.forEach(element => {
            if (element.id) {
                element.id = element.id.replace('__ID__', itemId);
            }
            
            if (element.getAttribute('for')) {
                element.setAttribute('for', element.getAttribute('for').replace('__ID__', itemId));
            }
            
            if (element.getAttribute('data-target')) {
                element.setAttribute('data-target', element.getAttribute('data-target').replace('__ID__', itemId));
            }
            
            if (element.name) {
                element.name = element.name.replace('__ID__', itemId);
            }
        });
        
        // Append the new item
        container.appendChild(clone);
        
        // Initialize event listeners for the new item
        const newItem = container.lastElementChild;
        
        // Image upload inputs
        const imageInputs = newItem.querySelectorAll('.image-upload-input');
        imageInputs.forEach(input => {
            input.addEventListener('change', handleImageUpload);
        });
        
        // Remove item button
        const removeBtn = newItem.querySelector('.remove-item-btn');
        if (removeBtn) {
            removeBtn.addEventListener('click', function() {
                newItem.remove();
                pendingChanges = true;
                highlightSaveButton(container.closest('form'));
            });
        }
        
        // Collapse toggle
        const collapseToggle = newItem.querySelector('.collapse-toggle');
        if (collapseToggle) {
            collapseToggle.addEventListener('click', function() {
                const target = document.querySelector(this.getAttribute('data-target'));
                if (target) {
                    target.classList.toggle('show');
                    this.classList.toggle('collapsed');
                }
            });
        }
        
        // Mark as having pending changes
        pendingChanges = true;
        highlightSaveButton(container.closest('form'));
        
        // Scroll to the new item
        newItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    /**
     * Highlight the save button to indicate pending changes
     * @param {HTMLFormElement} form - The form with pending changes
     */
    function highlightSaveButton(form) {
        const saveButton = form.querySelector('.save-changes-btn');
        if (saveButton) {
            saveButton.classList.add('btn-highlight');
            saveButton.innerHTML = '<i class="fas fa-save"></i> Save Changes*';
        }
    }

    /**
     * Reset the save button to its default state
     * @param {HTMLFormElement} form - The form to reset the button for
     */
    function resetSaveButton(form) {
        const saveButton = form.querySelector('.save-changes-btn');
        if (saveButton) {
            saveButton.classList.remove('btn-highlight');
            saveButton.innerHTML = '<i class="fas fa-save"></i> Save Changes';
            saveButton.disabled = false;
        }
    }

    /**
     * Validate a form
     * @param {HTMLFormElement} form - The form to validate
     * @returns {boolean} Whether the form is valid
     */
    function validateForm(form) {
        const requiredInputs = form.querySelectorAll('[required]');
        let isValid = true;
        
        requiredInputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('is-invalid');
                isValid = false;
                
                // Add error message if not already present
                const errorMsg = input.parentNode.querySelector('.invalid-feedback');
                if (!errorMsg) {
                    const error = document.createElement('div');
                    error.className = 'invalid-feedback';
                    error.textContent = 'This field is required';
                    input.parentNode.appendChild(error);
                }
            } else {
                input.classList.remove('is-invalid');
                
                // Remove error message if present
                const errorMsg = input.parentNode.querySelector('.invalid-feedback');
                if (errorMsg) {
                    errorMsg.remove();
                }
            }
        });
        
        return isValid;
    }

    // Data extraction methods for specific editors
    // These are kept private and specific to each data type

    /**
     * Extract projects data from the form
     * @returns {Array} Array of project objects
     */
    function extractProjectsData() {
        const projectItems = document.querySelectorAll('.project-item');
        const projects = Array.from(projectItems).map((item, index) => {
            const id = item.dataset.id || (index + 1).toString();
            const title = item.querySelector('.project-title-input').value;
            const description = item.querySelector('.project-description-input').value;
            const thumbnailUrl = item.querySelector('.project-thumbnail-input').value;
            
            // Get image URLs as an array
            const imageUrlsInput = item.querySelector('.project-images-input').value;
            const imageUrls = imageUrlsInput.split(',').map(url => url.trim()).filter(url => url);
            
            // Get categories as an array
            const categoriesInput = item.querySelector('.project-categories-input').value;
            const categories = categoriesInput.split(',').map(cat => cat.trim()).filter(cat => cat);
            
            // Get technologies as an array
            const technologiesInput = item.querySelector('.project-technologies-input').value;
            const technologies = technologiesInput.split(',').map(tech => tech.trim()).filter(tech => tech);
            
            const featured = item.querySelector('.project-featured-input').checked;
            const demoUrl = item.querySelector('.project-demo-input').value;
            const codeUrl = item.querySelector('.project-code-input').value;
            const details = item.querySelector('.project-details-input').value;
            const challenges = item.querySelector('.project-challenges-input').value;
            const outcomes = item.querySelector('.project-outcomes-input').value;
            
            return {
                id,
                title,
                description,
                thumbnailUrl,
                imageUrls,
                categories,
                technologies,
                featured,
                demoUrl,
                codeUrl,
                details,
                challenges,
                outcomes
            };
        });
        
        return projects;
    }

    /**
     * Extract skills data from the form
     * @returns {Array} Array of skill category objects
     */
    function extractSkillsData() {
        const categoryItems = document.querySelectorAll('.skill-category-item');
        const skills = Array.from(categoryItems).map(item => {
            const category = item.querySelector('.skill-category-name-input').value;
            const skillItems = item.querySelectorAll('.skill-item');
            
            const items = Array.from(skillItems).map(skillItem => {
                const name = skillItem.querySelector('.skill-name-input').value;
                const level = parseInt(skillItem.querySelector('.skill-level-input').value, 10);
                const levelText = skillItem.querySelector('.skill-level-text-input').value;
                const icon = skillItem.querySelector('.skill-icon-input').value;
                const description = skillItem.querySelector('.skill-description-input').value;
                const yearsExperience = parseInt(skillItem.querySelector('.skill-years-input').value, 10);
                
                // Check if this is an icon or iconText type
                let skillData = {
                    name,
                    level,
                    levelText,
                    description,
                    yearsExperience
                };
                
                if (icon.startsWith('fa')) {
                    // Font Awesome icon
                    skillData.icon = icon;
                } else {
                    // Text icon
                    skillData.icon = 'icon-text';
                    skillData.iconText = icon;
                }
                
                return skillData;
            });
            
            return {
                category,
                items
            };
        });
        
        return skills;
    }

    /**
     * Extract achievements data from the form
     * @returns {Object} Achievement data object
     */
    function extractAchievementsData() {
        const achievementData = {
            education: extractEducationData(),
            experience: extractExperienceData(),
            certificates: extractCertificatesData()
        };
        
        return achievementData;
    }

    /**
     * Extract education data from the form
     * @returns {Array} Array of education items
     */
    function extractEducationData() {
        const educationItems = document.querySelectorAll('.education-item');
        return Array.from(educationItems).map(item => {
            return {
                degree: item.querySelector('.education-degree-input').value,
                institution: item.querySelector('.education-institution-input').value,
                location: item.querySelector('.education-location-input').value,
                startDate: item.querySelector('.education-start-input').value,
                endDate: item.querySelector('.education-end-input').value || 'Present',
                description: item.querySelector('.education-description-input').value,
                achievements: item.querySelector('.education-achievements-input').value
                    .split('\n').map(line => line.trim()).filter(line => line)
            };
        });
    }

    /**
     * Extract experience data from the form
     * @returns {Array} Array of experience items
     */
    function extractExperienceData() {
        const experienceItems = document.querySelectorAll('.experience-item');
        return Array.from(experienceItems).map(item => {
            return {
                position: item.querySelector('.experience-position-input').value,
                company: item.querySelector('.experience-company-input').value,
                location: item.querySelector('.experience-location-input').value,
                startDate: item.querySelector('.experience-start-input').value,
                endDate: item.querySelector('.experience-end-input').value || 'Present',
                description: item.querySelector('.experience-description-input').value,
                responsibilities: item.querySelector('.experience-responsibilities-input').value
                    .split('\n').map(line => line.trim()).filter(line => line)
            };
        });
    }

    /**
     * Extract certificates data from the form
     * @returns {Array} Array of certificate items
     */
    function extractCertificatesData() {
        const certificateItems = document.querySelectorAll('.certificate-item');
        return Array.from(certificateItems).map(item => {
            return {
                name: item.querySelector('.certificate-name-input').value,
                issuer: item.querySelector('.certificate-issuer-input').value,
                date: item.querySelector('.certificate-date-input').value,
                credentialId: item.querySelector('.certificate-credential-input').value,
                verificationUrl: item.querySelector('.certificate-url-input').value,
                skills: item.querySelector('.certificate-skills-input').value
                    .split(',').map(skill => skill.trim()).filter(skill => skill)
            };
        });
    }

    /**
     * Extract gallery data from the form
     * @returns {Array} Array of gallery items
     */
    function extractGalleryData() {
        const galleryItems = document.querySelectorAll('.gallery-item');
        return Array.from(galleryItems).map((item, index) => {
            const id = item.dataset.id || (index + 1).toString();
            
            return {
                id,
                title: item.querySelector('.gallery-title-input').value,
                description: item.querySelector('.gallery-description-input').value,
                imageUrl: item.querySelector('.gallery-image-input').value,
                thumbUrl: item.querySelector('.gallery-thumb-input').value,
                category: item.querySelector('.gallery-category-input').value,
                featured: item.querySelector('.gallery-featured-input').checked,
                date: item.querySelector('.gallery-date-input').value
            };
        });
    }

    /**
     * Extract testimonials data from the form
     * @returns {Array} Array of testimonial items
     */
    function extractTestimonialsData() {
        const testimonialItems = document.querySelectorAll('.testimonial-item');
        return Array.from(testimonialItems).map((item, index) => {
            const id = item.dataset.id || (index + 1).toString();
            
            return {
                id,
                name: item.querySelector('.testimonial-name-input').value,
                position: item.querySelector('.testimonial-position-input').value,
                company: item.querySelector('.testimonial-company-input').value,
                avatar: item.querySelector('.testimonial-avatar-input').value,
                testimonial: item.querySelector('.testimonial-content-input').value,
                rating: parseInt(item.querySelector('.testimonial-rating-input').value, 10),
                project: item.querySelector('.testimonial-project-input').value,
                featured: item.querySelector('.testimonial-featured-input').checked,
                date: item.querySelector('.testimonial-date-input').value
            };
        });
    }

    /**
     * Populate the projects editor with existing data
     * @param {Array} projects - Array of project objects
     */
    function populateProjectsEditor(projects) {
        const container = document.querySelector('#projects-container');
        if (!container) return;
        
        // Clear existing content
        container.innerHTML = '';
        
        // Add each project
        projects.forEach(project => {
            const template = document.querySelector('#projects-item-template');
            const clone = document.importNode(template.content, true);
            
            // Set ID and other data attributes
            const item = clone.querySelector('.project-item');
            item.dataset.id = project.id;
            
            // Populate form fields
            clone.querySelector('.project-title-input').value = project.title || '';
            clone.querySelector('.project-description-input').value = project.description || '';
            clone.querySelector('.project-thumbnail-input').value = project.thumbnailUrl || '';
            
            // Set image URLs as comma-separated string
            if (project.imageUrls && Array.isArray(project.imageUrls)) {
                clone.querySelector('.project-images-input').value = project.imageUrls.join(', ');
            }
            
            // Set categories as comma-separated string
            if (project.categories && Array.isArray(project.categories)) {
                clone.querySelector('.project-categories-input').value = project.categories.join(', ');
            }
            
            // Set technologies as comma-separated string
            if (project.technologies && Array.isArray(project.technologies)) {
                clone.querySelector('.project-technologies-input').value = project.technologies.join(', ');
            }
            
            clone.querySelector('.project-featured-input').checked = project.featured || false;
            clone.querySelector('.project-demo-input').value = project.demoUrl || '';
            clone.querySelector('.project-code-input').value = project.codeUrl || '';
            clone.querySelector('.project-details-input').value = project.details || '';
            clone.querySelector('.project-challenges-input').value = project.challenges || '';
            clone.querySelector('.project-outcomes-input').value = project.outcomes || '';
            
            // Set image previews if available
            if (project.thumbnailUrl) {
                const thumbnailPreview = clone.querySelector('.thumbnail-preview');
                if (thumbnailPreview) {
                    thumbnailPreview.innerHTML = `
                        <div class="preview-image-container">
                            <img src="../${project.thumbnailUrl}" alt="Preview" class="preview-image">
                        </div>
                    `;
                }
            }
            
            // Add event listener for remove button
            const removeBtn = clone.querySelector('.remove-item-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', function() {
                    const item = this.closest('.project-item');
                    item.remove();
                    pendingChanges = true;
                    highlightSaveButton(container.closest('form'));
                });
            }
            
            // Append the item
            container.appendChild(clone);
        });
        
        // Re-initialize sortable
        initSortableLists();
    }

    /**
     * Populate the skills editor with existing data
     * @param {Array} skillCategories - Array of skill category objects
     */
    function populateSkillsEditor(skillCategories) {
        const container = document.querySelector('#skills-container');
        if (!container) return;
        
        // Clear existing content
        container.innerHTML = '';
        
        // Add each skill category
        skillCategories.forEach(category => {
            const template = document.querySelector('#skill-category-template');
            const clone = document.importNode(template.content, true);
            
            // Set category name
            clone.querySelector('.skill-category-name-input').value = category.category || '';
            
            // Get the skills container for this category
            const skillsContainer = clone.querySelector('.skills-list');
            
            // Add each skill item
            if (category.items && Array.isArray(category.items)) {
                category.items.forEach(skill => {
                    const skillTemplate = document.querySelector('#skill-item-template');
                    const skillClone = document.importNode(skillTemplate.content, true);
                    
                    // Populate skill data
                    skillClone.querySelector('.skill-name-input').value = skill.name || '';
                    skillClone.querySelector('.skill-level-input').value = skill.level || 0;
                    skillClone.querySelector('.skill-level-text-input').value = skill.levelText || '';
                    
                    // Handle icon vs iconText
                    if (skill.icon === 'icon-text' && skill.iconText) {
                        skillClone.querySelector('.skill-icon-input').value = skill.iconText;
                    } else {
                        skillClone.querySelector('.skill-icon-input').value = skill.icon || '';
                    }
                    
                    skillClone.querySelector('.skill-description-input').value = skill.description || '';
                    skillClone.querySelector('.skill-years-input').value = skill.yearsExperience || 0;
                    
                    // Add event listener for remove button
                    const removeBtn = skillClone.querySelector('.remove-skill-btn');
                    if (removeBtn) {
                        removeBtn.addEventListener('click', function() {
                            const item = this.closest('.skill-item');
                            item.remove();
                            pendingChanges = true;
                            highlightSaveButton(container.closest('form'));
                        });
                    }
                    
                    // Append skill to container
                    skillsContainer.appendChild(skillClone);
                });
            }
            
            // Add event listener for remove category button
            const removeCategoryBtn = clone.querySelector('.remove-category-btn');
            if (removeCategoryBtn) {
                removeCategoryBtn.addEventListener('click', function() {
                    const item = this.closest('.skill-category-item');
                    item.remove();
                    pendingChanges = true;
                    highlightSaveButton(container.closest('form'));
                });
            }
            
            // Add event listener for add skill button
            const addSkillBtn = clone.querySelector('.add-skill-btn');
            if (addSkillBtn) {
                addSkillBtn.addEventListener('click', function() {
                    const skillsList = this.closest('.skill-category-item').querySelector('.skills-list');
                    const skillTemplate = document.querySelector('#skill-item-template');
                    const skillClone = document.importNode(skillTemplate.content, true);
                    
                    // Add event listener for remove button
                    const removeBtn = skillClone.querySelector('.remove-skill-btn');
                    if (removeBtn) {
                        removeBtn.addEventListener('click', function() {
                            const item = this.closest('.skill-item');
                            item.remove();
                            pendingChanges = true;
                            highlightSaveButton(container.closest('form'));
                        });
                    }
                    
                    skillsList.appendChild(skillClone);
                    pendingChanges = true;
                    highlightSaveButton(container.closest('form'));
                });
            }
            
            // Append category to container
            container.appendChild(clone);
        });
        
        // Re-initialize sortable
        initSortableLists();
    }

    /**
     * Populate the achievements editor with existing data
     * @param {Object} achievements - Achievements data object
     */
    function populateAchievementsEditor(achievements) {
        if (achievements.education) {
            populateEducationData(achievements.education);
        }
        
        if (achievements.experience) {
            populateExperienceData(achievements.experience);
        }
        
        if (achievements.certificates) {
            populateCertificatesData(achievements.certificates);
        }
        
        // Re-initialize sortable
        initSortableLists();
    }

    /**
     * Populate education data in the editor
     * @param {Array} educationItems - Array of education objects
     */
    function populateEducationData(educationItems) {
        const container = document.querySelector('#education-container');
        if (!container) return;
        
        // Clear existing content
        container.innerHTML = '';
        
        // Add each education item
        educationItems.forEach(edu => {
            const template = document.querySelector('#education-item-template');
            const clone = document.importNode(template.content, true);
            
            // Populate form fields
            clone.querySelector('.education-degree-input').value = edu.degree || '';
            clone.querySelector('.education-institution-input').value = edu.institution || '';
            clone.querySelector('.education-location-input').value = edu.location || '';
            clone.querySelector('.education-start-input').value = edu.startDate || '';
            clone.querySelector('.education-end-input').value = (edu.endDate === 'Present' ? '' : edu.endDate) || '';
            clone.querySelector('.education-description-input').value = edu.description || '';
            
            // Set achievements as multi-line string
            if (edu.achievements && Array.isArray(edu.achievements)) {
                clone.querySelector('.education-achievements-input').value = edu.achievements.join('\n');
            }
            
            // Add event listener for remove button
            const removeBtn = clone.querySelector('.remove-item-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', function() {
                    const item = this.closest('.education-item');
                    item.remove();
                    pendingChanges = true;
                    highlightSaveButton(container.closest('form'));
                });
            }
            
            // Append the item
            container.appendChild(clone);
        });
    }

    /**
     * Populate experience data in the editor
     * @param {Array} experienceItems - Array of experience objects
     */
    function populateExperienceData(experienceItems) {
        const container = document.querySelector('#experience-container');
        if (!container) return;
        
        // Clear existing content
        container.innerHTML = '';
        
        // Add each experience item
        experienceItems.forEach(exp => {
            const template = document.querySelector('#experience-item-template');
            const clone = document.importNode(template.content, true);
            
            // Populate form fields
            clone.querySelector('.experience-position-input').value = exp.position || '';
            clone.querySelector('.experience-company-input').value = exp.company || '';
            clone.querySelector('.experience-location-input').value = exp.location || '';
            clone.querySelector('.experience-start-input').value = exp.startDate || '';
            clone.querySelector('.experience-end-input').value = (exp.endDate === 'Present' ? '' : exp.endDate) || '';
            clone.querySelector('.experience-description-input').value = exp.description || '';
            
            // Set responsibilities as multi-line string
            if (exp.responsibilities && Array.isArray(exp.responsibilities)) {
                clone.querySelector('.experience-responsibilities-input').value = exp.responsibilities.join('\n');
            }
            
            // Add event listener for remove button
            const removeBtn = clone.querySelector('.remove-item-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', function() {
                    const item = this.closest('.experience-item');
                    item.remove();
                    pendingChanges = true;
                    highlightSaveButton(container.closest('form'));
                });
            }
            
            // Append the item
            container.appendChild(clone);
        });
    }

    /**
     * Populate certificates data in the editor
     * @param {Array} certificateItems - Array of certificate objects
     */
    function populateCertificatesData(certificateItems) {
        const container = document.querySelector('#certificates-container');
        if (!container) return;
        
        // Clear existing content
        container.innerHTML = '';
        
        // Add each certificate item
        certificateItems.forEach(cert => {
            const template = document.querySelector('#certificate-item-template');
            const clone = document.importNode(template.content, true);
            
            // Populate form fields
            clone.querySelector('.certificate-name-input').value = cert.name || '';
            clone.querySelector('.certificate-issuer-input').value = cert.issuer || '';
            clone.querySelector('.certificate-date-input').value = cert.date || '';
            clone.querySelector('.certificate-credential-input').value = cert.credentialId || '';
            clone.querySelector('.certificate-url-input').value = cert.verificationUrl || '';
            
            // Set skills as comma-separated string
            if (cert.skills && Array.isArray(cert.skills)) {
                clone.querySelector('.certificate-skills-input').value = cert.skills.join(', ');
            }
            
            // Add event listener for remove button
            const removeBtn = clone.querySelector('.remove-item-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', function() {
                    const item = this.closest('.certificate-item');
                    item.remove();
                    pendingChanges = true;
                    highlightSaveButton(container.closest('form'));
                });
            }
            
            // Append the item
            container.appendChild(clone);
        });
    }

    /**
     * Populate the gallery editor with existing data
     * @param {Array} galleryItems - Array of gallery objects
     */
    function populateGalleryEditor(galleryItems) {
        const container = document.querySelector('#gallery-container');
        if (!container) return;
        
        // Clear existing content
        container.innerHTML = '';
        
        // Add each gallery item
        galleryItems.forEach(item => {
            const template = document.querySelector('#gallery-item-template');
            const clone = document.importNode(template.content, true);
            
            // Set ID and other data attributes
            const galleryItem = clone.querySelector('.gallery-item');
            galleryItem.dataset.id = item.id;
            
            // Populate form fields
            clone.querySelector('.gallery-title-input').value = item.title || '';
            clone.querySelector('.gallery-description-input').value = item.description || '';
            clone.querySelector('.gallery-image-input').value = item.imageUrl || '';
            clone.querySelector('.gallery-thumb-input').value = item.thumbUrl || '';
            clone.querySelector('.gallery-category-input').value = item.category || '';
            clone.querySelector('.gallery-featured-input').checked = item.featured || false;
            clone.querySelector('.gallery-date-input').value = item.date || '';
            
            // Set image previews if available
            if (item.thumbUrl) {
                const thumbPreview = clone.querySelector('.thumbnail-preview');
                if (thumbPreview) {
                    thumbPreview.innerHTML = `
                        <div class="preview-image-container">
                            <img src="../${item.thumbUrl}" alt="Preview" class="preview-image">
                        </div>
                    `;
                }
            }
            
            if (item.imageUrl) {
                const imagePreview = clone.querySelector('.image-preview');
                if (imagePreview) {
                    imagePreview.innerHTML = `
                        <div class="preview-image-container">
                            <img src="../${item.imageUrl}" alt="Preview" class="preview-image">
                        </div>
                    `;
                }
            }
            
            // Add event listener for remove button
            const removeBtn = clone.querySelector('.remove-item-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', function() {
                    const item = this.closest('.gallery-item');
                    item.remove();
                    pendingChanges = true;
                    highlightSaveButton(container.closest('form'));
                });
            }
            
            // Append the item
            container.appendChild(clone);
        });
        
        // Re-initialize sortable
        initSortableLists();
    }

    /**
     * Populate the testimonials editor with existing data
     * @param {Array} testimonialItems - Array of testimonial objects
     */
    function populateTestimonialsEditor(testimonialItems) {
        const container = document.querySelector('#testimonials-container');
        if (!container) return;
        
        // Clear existing content
        container.innerHTML = '';
        
        // Add each testimonial item
        testimonialItems.forEach(item => {
            const template = document.querySelector('#testimonial-item-template');
            const clone = document.importNode(template.content, true);
            
            // Set ID and other data attributes
            const testimonialItem = clone.querySelector('.testimonial-item');
            testimonialItem.dataset.id = item.id;
            
            // Populate form fields
            clone.querySelector('.testimonial-name-input').value = item.name || '';
            clone.querySelector('.testimonial-position-input').value = item.position || '';
            clone.querySelector('.testimonial-company-input').value = item.company || '';
            clone.querySelector('.testimonial-avatar-input').value = item.avatar || '';
            clone.querySelector('.testimonial-content-input').value = item.testimonial || '';
            clone.querySelector('.testimonial-rating-input').value = item.rating || 5;
            clone.querySelector('.testimonial-project-input').value = item.project || '';
            clone.querySelector('.testimonial-featured-input').checked = item.featured || false;
            clone.querySelector('.testimonial-date-input').value = item.date || '';
            
            // Set avatar preview if available
            if (item.avatar) {
                const avatarPreview = clone.querySelector('.avatar-preview');
                if (avatarPreview) {
                    avatarPreview.innerHTML = `
                        <div class="preview-image-container">
                            <img src="../${item.avatar}" alt="Avatar" class="preview-image">
                        </div>
                    `;
                }
            }
            
            // Add event listener for remove button
            const removeBtn = clone.querySelector('.remove-item-btn');
            if (removeBtn) {
                removeBtn.addEventListener('click', function() {
                    const item = this.closest('.testimonial-item');
                    item.remove();
                    pendingChanges = true;
                    highlightSaveButton(container.closest('form'));
                });
            }
            
            // Append the item
            container.appendChild(clone);
        });
        
        // Re-initialize sortable
        initSortableLists();
    }

    // Public API
    return {
        init
    };
})();

// Initialize module when DOM is ready
document.addEventListener('DOMContentLoaded', EditorModule.init);