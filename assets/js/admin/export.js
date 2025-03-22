/**
 * Admin Data Export Module
 * Author: Md. Shahriar Rakib Rabbi
 * 
 * This file handles data export functionality for the portfolio admin area.
 * It provides functions to export data in different formats (JSON, CSV, PDF)
 * and manage the export process.
 */

// Create namespace for Export functionality
const AdminExport = (function() {
    /**
     * Export data as JSON file
     * @param {Object|Array} data - The data to export
     * @param {string} filename - Name of the file without extension
     */
    function toJSON(data, filename = 'export') {
        try {
            // Format JSON with indentation
            const jsonData = JSON.stringify(data, null, 2);
            const blob = new Blob([jsonData], { type: 'application/json' });
            
            // Create download
            downloadFile(blob, `${filename}.json`);
            return true;
        } catch (error) {
            console.error('Error exporting JSON:', error);
            showNotification('Failed to export JSON data', 'error');
            return false;
        }
    }
    
    /**
     * Export data as CSV file
     * @param {Array} data - Array of objects to export
     * @param {string} filename - Name of the file without extension
     * @param {Array} headers - Optional custom headers
     */
    function toCSV(data, filename = 'export', headers = null) {
        try {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('Data must be a non-empty array');
            }
            
            // Extract headers from first object if not provided
            const columnHeaders = headers || Object.keys(data[0]);
            
            // Create CSV content
            let csvContent = columnHeaders.join(',') + '\n';
            
            // Add data rows
            data.forEach(item => {
                const row = columnHeaders.map(header => {
                    const value = item[header];
                    
                    // Handle special cases
                    if (value === null || value === undefined) return '';
                    if (typeof value === 'object') return JSON.stringify(value).replace(/"/g, '""');
                    
                    // Escape quotes and wrap in quotes if needed
                    const cellValue = String(value).replace(/"/g, '""');
                    return cellValue.includes(',') || cellValue.includes('"') || cellValue.includes('\n') 
                        ? `"${cellValue}"` 
                        : cellValue;
                });
                
                csvContent += row.join(',') + '\n';
            });
            
            // Create download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
            downloadFile(blob, `${filename}.csv`);
            return true;
        } catch (error) {
            console.error('Error exporting CSV:', error);
            showNotification('Failed to export CSV data', 'error');
            return false;
        }
    }
    
    /**
     * Export data as Excel file
     * @param {Array} data - Array of objects to export
     * @param {string} filename - Name of the file without extension
     * @param {string} sheetName - Name of the Excel sheet
     */
    function toExcel(data, filename = 'export', sheetName = 'Sheet1') {
        try {
            if (typeof XLSX === 'undefined') {
                throw new Error('SheetJS (XLSX) library not loaded');
            }
            
            // Create workbook and worksheet
            const worksheet = XLSX.utils.json_to_sheet(data);
            const workbook = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
            
            // Generate file and trigger download
            XLSX.writeFile(workbook, `${filename}.xlsx`);
            return true;
        } catch (error) {
            console.error('Error exporting Excel:', error);
            
            // If SheetJS isn't available, fall back to CSV
            if (error.message === 'SheetJS (XLSX) library not loaded') {
                showNotification('Excel export not available, using CSV instead', 'warning');
                return toCSV(data, filename);
            } else {
                showNotification('Failed to export Excel data', 'error');
                return false;
            }
        }
    }
    
    /**
     * Export data as PDF
     * @param {Array} data - Array of objects to export
     * @param {string} filename - Name of the file without extension
     * @param {Object} options - PDF export options
     */
    function toPDF(data, filename = 'export', options = {}) {
        try {
            if (typeof jsPDF === 'undefined' || typeof autoTable === 'undefined') {
                throw new Error('jsPDF and/or jspdf-autotable not loaded');
            }
            
            // Default options
            const config = {
                title: options.title || filename,
                author: options.author || 'Portfolio Admin',
                orientation: options.orientation || 'portrait',
                pageSize: options.pageSize || 'a4',
                header: options.header || null,
                footer: options.footer || null,
                ...options
            };
            
            // Create PDF document
            const doc = new jsPDF({
                orientation: config.orientation,
                unit: 'mm',
                format: config.pageSize
            });
            
            // Add metadata
            doc.setProperties({
                title: config.title,
                author: config.author,
                subject: 'Portfolio Data Export',
                keywords: 'portfolio, export, data',
                creator: 'Portfolio Admin Panel'
            });
            
            // Add title if present
            if (config.title) {
                doc.setFontSize(18);
                doc.text(config.title, 14, 20);
                doc.setLineWidth(0.5);
                doc.line(14, 25, 196, 25);
            }
            
            // Convert data for autoTable
            let tableData = [];
            let tableColumns = [];
            
            if (Array.isArray(data)) {
                if (data.length === 0) {
                    throw new Error('Data array is empty');
                }
                
                // Extract columns from object keys
                tableColumns = Object.keys(data[0]).map(key => ({
                    header: key,
                    dataKey: key
                }));
                
                tableData = data;
            } else if (typeof data === 'object') {
                // Convert object to array format
                tableColumns = [
                    { header: 'Property', dataKey: 'property' },
                    { header: 'Value', dataKey: 'value' }
                ];
                
                tableData = Object.entries(data).map(([key, value]) => ({
                    property: key,
                    value: typeof value === 'object' ? JSON.stringify(value) : value
                }));
            }
            
            // Add table to document
            autoTable(doc, {
                startY: config.title ? 30 : 10,
                head: [tableColumns.map(col => col.header)],
                body: tableData.map(row => 
                    tableColumns.map(col => {
                        const value = row[col.dataKey];
                        return value === null || value === undefined ? '' : value;
                    })
                ),
                headStyles: {
                    fillColor: [66, 66, 66],
                    textColor: 255,
                    fontStyle: 'bold'
                },
                alternateRowStyles: {
                    fillColor: [245, 245, 245]
                },
                margin: { top: 10 },
                didDrawPage: function(data) {
                    // Add header
                    if (config.header) {
                        doc.setFontSize(10);
                        doc.setTextColor(100);
                        doc.text(config.header, data.settings.margin.left, 10);
                    }
                    
                    // Add footer
                    if (config.footer) {
                        doc.setFontSize(10);
                        doc.setTextColor(100);
                        doc.text(
                            config.footer, 
                            data.settings.margin.left, 
                            doc.internal.pageSize.height - 10
                        );
                    } else {
                        // Default footer with page number
                        doc.setFontSize(10);
                        doc.setTextColor(100);
                        doc.text(
                            `Page ${doc.internal.getNumberOfPages()}`,
                            doc.internal.pageSize.width - 20, 
                            doc.internal.pageSize.height - 10
                        );
                    }
                }
            });
            
            // Save PDF
            doc.save(`${filename}.pdf`);
            return true;
        } catch (error) {
            console.error('Error exporting PDF:', error);
            
            // If PDF libraries aren't loaded, offer JSON export instead
            if (error.message === 'jsPDF and/or jspdf-autotable not loaded') {
                showNotification('PDF export not available, using JSON instead', 'warning');
                return toJSON(data, filename);
            } else {
                showNotification('Failed to export PDF data', 'error');
                return false;
            }
        }
    }
    
    /**
     * Export data as HTML table
     * @param {Array} data - Array of objects to export
     * @param {string} filename - Name of the file without extension
     */
    function toHTML(data, filename = 'export') {
        try {
            if (!Array.isArray(data) || data.length === 0) {
                throw new Error('Data must be a non-empty array');
            }
            
            // Extract headers
            const headers = Object.keys(data[0]);
            
            // Create HTML content
            let htmlContent = `
                <!DOCTYPE html>
                <html lang="en">
                <head>
                    <meta charset="UTF-8">
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <title>${filename}</title>
                    <style>
                        body { font-family: Arial, sans-serif; }
                        table { border-collapse: collapse; width: 100%; margin: 20px 0; }
                        th, td { padding: 8px; text-align: left; border: 1px solid #ddd; }
                        th { background-color: #f2f2f2; font-weight: bold; }
                        tr:nth-child(even) { background-color: #f9f9f9; }
                        h1 { color: #333; }
                        .export-info { color: #666; font-size: 12px; margin-top: 30px; }
                    </style>
                </head>
                <body>
                    <h1>${filename}</h1>
                    <table>
                        <thead>
                            <tr>
                                ${headers.map(header => `<th>${header}</th>`).join('')}
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            // Add data rows
            data.forEach(item => {
                htmlContent += '<tr>';
                headers.forEach(header => {
                    const value = item[header];
                    htmlContent += `<td>${value === null || value === undefined ? '' : String(value)}</td>`;
                });
                htmlContent += '</tr>';
            });
            
            htmlContent += `
                        </tbody>
                    </table>
                    <div class="export-info">
                        Exported on ${new Date().toLocaleString()} from Portfolio Admin Panel
                    </div>
                </body>
                </html>
            `;
            
            // Create download
            const blob = new Blob([htmlContent], { type: 'text/html' });
            downloadFile(blob, `${filename}.html`);
            return true;
        } catch (error) {
            console.error('Error exporting HTML:', error);
            showNotification('Failed to export HTML data', 'error');
            return false;
        }
    }
    
    /**
     * Export data in custom format with templates
     * @param {Object|Array} data - Data to export
     * @param {string} template - Template string with placeholders
     * @param {string} filename - Name of the file without extension
     * @param {string} extension - File extension
     */
    function withTemplate(data, template, filename = 'export', extension = 'txt') {
        try {
            // Process template with data
            let output = template;
            
            // Replace placeholders in template
            if (Array.isArray(data)) {
                // For arrays, look for loop templates
                const loopRegex = /\{\{#each items\}\}([\s\S]*?)\{\{\/each\}\}/g;
                output = output.replace(loopRegex, (match, content) => {
                    return data.map(item => {
                        let itemContent = content;
                        // Replace item properties in the loop content
                        Object.entries(item).forEach(([key, value]) => {
                            const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                            itemContent = itemContent.replace(regex, value);
                        });
                        return itemContent;
                    }).join('');
                });
            } else if (typeof data === 'object') {
                // For objects, replace direct properties
                Object.entries(data).forEach(([key, value]) => {
                    const regex = new RegExp(`\\{\\{${key}\\}\\}`, 'g');
                    output = output.replace(regex, value);
                });
            }
            
            // Add metadata replacements
            output = output.replace(/\{\{date\}\}/g, new Date().toLocaleDateString());
            output = output.replace(/\{\{time\}\}/g, new Date().toLocaleTimeString());
            output = output.replace(/\{\{datetime\}\}/g, new Date().toLocaleString());
            
            // Create download
            const blob = new Blob([output], { type: 'text/plain' });
            downloadFile(blob, `${filename}.${extension}`);
            return true;
        } catch (error) {
            console.error('Error exporting with template:', error);
            showNotification('Failed to export data using template', 'error');
            return false;
        }
    }
    
    /**
     * Export multiple data sets as a ZIP archive
     * @param {Object} dataSets - Object with key as filename and value as data
     * @param {string} zipFilename - Name for the ZIP file
     */
    function toZIP(dataSets, zipFilename = 'export') {
        try {
            if (typeof JSZip === 'undefined') {
                throw new Error('JSZip library not loaded');
            }
            
            // Create new ZIP file
            const zip = new JSZip();
            
            // Add files to zip
            Object.entries(dataSets).forEach(([filename, data]) => {
                // Determine file extension and format
                const extension = filename.split('.').pop();
                const content = typeof data === 'object' ? JSON.stringify(data, null, 2) : String(data);
                
                // Add file to zip
                zip.file(filename, content);
            });
            
            // Generate zip and trigger download
            zip.generateAsync({ type: 'blob' })
                .then(function(content) {
                    downloadFile(content, `${zipFilename}.zip`);
                    showNotification('ZIP archive created successfully', 'success');
                });
            
            return true;
        } catch (error) {
            console.error('Error creating ZIP archive:', error);
            
            if (error.message === 'JSZip library not loaded') {
                showNotification('ZIP export not available, try individual files instead', 'warning');
            } else {
                showNotification('Failed to create ZIP archive', 'error');
            }
            return false;
        }
    }
    
    /**
     * Download blob as a file
     * @param {Blob} blob - File blob to download
     * @param {string} filename - Name for the downloaded file
     */
    function downloadFile(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        
        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the URL
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
    
    /**
     * Show notification for export status
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, info, warning)
     */
    function showNotification(message, type = 'info') {
        // Use UI Components if available
        if (window.UIComponents && window.UIComponents.showToast) {
            window.UIComponents.showToast(message, type);
            return;
        }
        
        // Fall back to built-in notification if admin notifications exist
        if (window.AdminUI && window.AdminUI.showNotification) {
            window.AdminUI.showNotification(message, type);
            return;
        }
        
        // Default to alert for critical errors, console for others
        if (type === 'error') {
            alert(message);
        } else {
            console.log(`${type.toUpperCase()}: ${message}`);
        }
    }
    
    /**
     * Generate a filename with date suffix
     * @param {string} baseName - Base filename
     * @returns {string} Filename with date
     */
    function generateFilename(baseName) {
        const now = new Date();
        const dateSuffix = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`;
        return `${baseName}_${dateSuffix}`;
    }
    
    /**
     * Export all portfolio data as a backup
     * @param {boolean} includeImages - Whether to include images in the backup
     * @returns {Promise} Promise that resolves when backup is complete
     */
    function createBackup(includeImages = false) {
        showNotification('Creating backup...', 'info');
        
        return new Promise((resolve, reject) => {
            try {
                // Define data files to include
                const dataFiles = [
                    'projects.json',
                    'skills.json',
                    'achievements.json',
                    'gallery.json',
                    'testimonials.json'
                ];
                
                // Load all data files
                const dataPromises = dataFiles.map(file => 
                    window.loadData(`data/${file}`)
                        .catch(err => {
                            console.warn(`Failed to load ${file}:`, err);
                            return null; // Return null for failed loads
                        })
                );
                
                Promise.all(dataPromises)
                    .then(results => {
                        // Create backup object with data from each file
                        const backup = {
                            metadata: {
                                created: new Date().toISOString(),
                                version: '1.0',
                                files: dataFiles
                            }
                        };
                        
                        // Add each data file to backup
                        results.forEach((data, index) => {
                            if (data !== null) {
                                const filename = dataFiles[index];
                                const key = filename.replace('.json', '');
                                backup[key] = data;
                            }
                        });
                        
                        // Create ZIP if JSZip is available, otherwise JSON
                        if (typeof JSZip !== 'undefined' && includeImages) {
                            // Create a ZIP with JSON files and optionally images
                            const zip = new JSZip();
                            
                            // Add backup JSON
                            zip.file('backup.json', JSON.stringify(backup, null, 2));
                            
                            // Add individual data files
                            dataFiles.forEach((filename, index) => {
                                if (results[index] !== null) {
                                    zip.file(`data/${filename}`, JSON.stringify(results[index], null, 2));
                                }
                            });
                            
                            // Generate and download ZIP
                            zip.generateAsync({ type: 'blob' })
                                .then(content => {
                                    downloadFile(content, `portfolio_backup_${new Date().toISOString().slice(0, 10)}.zip`);
                                    showNotification('Backup created successfully', 'success');
                                    resolve(backup);
                                })
                                .catch(err => {
                                    console.error('Error creating ZIP backup:', err);
                                    // Fall back to JSON backup
                                    toJSON(backup, generateFilename('portfolio_backup'));
                                    resolve(backup);
                                });
                        } else {
                            // Just export the JSON backup
                            toJSON(backup, generateFilename('portfolio_backup'));
                            showNotification('Backup created successfully', 'success');
                            resolve(backup);
                        }
                    })
                    .catch(error => {
                        console.error('Error creating backup:', error);
                        showNotification('Failed to create backup', 'error');
                        reject(error);
                    });
            } catch (error) {
                console.error('Error initiating backup:', error);
                showNotification('Failed to initiate backup process', 'error');
                reject(error);
            }
        });
    }
    
    /**
     * Restore from a backup file
     * @param {File} backupFile - Backup file to restore from
     * @returns {Promise} Promise that resolves when restore is complete
     */
    function restoreBackup(backupFile) {
        return new Promise((resolve, reject) => {
            try {
                const reader = new FileReader();
                
                reader.onload = function(e) {
                    try {
                        // Parse the backup data
                        const backup = JSON.parse(e.target.result);
                        
                        // Check if it's a valid backup
                        if (!backup.metadata) {
                            throw new Error('Invalid backup file format');
                        }
                        
                        // Extract data sets to restore
                        const datasets = Object.entries(backup).filter(([key]) => key !== 'metadata');
                        
                        // Confirm restoration
                        if (!confirm(`Are you sure you want to restore ${datasets.length} data sets? This will overwrite your current data.`)) {
                            reject(new Error('Restoration cancelled by user'));
                            return;
                        }
                        
                        showNotification('Restoring backup...', 'info');
                        
                        // Restore each data set
                        const savePromises = datasets.map(([key, data]) => {
                            return window.saveData(`data/${key}.json`, data)
                                .catch(err => {
                                    console.error(`Failed to restore ${key}:`, err);
                                    return { success: false, key };
                                });
                        });
                        
                        Promise.all(savePromises)
                            .then(results => {
                                const failures = results.filter(result => result && !result.success);
                                
                                if (failures.length > 0) {
                                    const failedKeys = failures.map(f => f.key).join(', ');
                                    showNotification(`Restore completed with errors. Failed to restore: ${failedKeys}`, 'warning');
                                } else {
                                    showNotification('Backup restored successfully', 'success');
                                }
                                
                                // Reload the page to reflect changes
                                setTimeout(() => {
                                    window.location.reload();
                                }, 2000);
                                
                                resolve({ success: true, failures });
                            })
                            .catch(error => {
                                console.error('Error during restore:', error);
                                showNotification('Failed to complete restoration', 'error');
                                reject(error);
                            });
                    } catch (error) {
                        console.error('Error parsing backup file:', error);
                        showNotification('Invalid backup file format', 'error');
                        reject(error);
                    }
                };
                
                reader.onerror = function() {
                    reject(new Error('Failed to read backup file'));
                };
                
                reader.readAsText(backupFile);
            } catch (error) {
                console.error('Error initiating restore:', error);
                showNotification('Failed to initiate restore process', 'error');
                reject(error);
            }
        });
    }
    
    // Initialize export functionality
    function init() {
        // Set up export buttons
        document.addEventListener('click', function(event) {
            // Check if clicked element has export data attributes
            if (event.target.matches('[data-export]')) {
                const exportType = event.target.getAttribute('data-export');
                const dataSource = event.target.getAttribute('data-source');
                const filename = event.target.getAttribute('data-filename') || 'export';
                
                if (!dataSource) {
                    console.error('No data source specified for export');
                    return;
                }
                
                // Get data from source attribute
                let data;
                try {
                    // Try to find data in window scope first
                    if (window[dataSource]) {
                        data = window[dataSource];
                    } else {
                        // Try to parse as JSON if it's a string
                        data = JSON.parse(dataSource);
                    }
                } catch (error) {
                    console.error('Error getting export data:', error);
                    showNotification('Failed to get export data', 'error');
                    return;
                }
                
                // Handle different export types
                switch (exportType) {
                    case 'json':
                        toJSON(data, filename);
                        break;
                    case 'csv':
                        toCSV(data, filename);
                        break;
                    case 'excel':
                        toExcel(data, filename);
                        break;
                    case 'pdf':
                        toPDF(data, filename);
                        break;
                    case 'html':
                        toHTML(data, filename);
                        break;
                    case 'backup':
                        createBackup();
                        break;
                    default:
                        console.error(`Unknown export type: ${exportType}`);
                        showNotification('Unknown export format', 'error');
                }
            }
        });
        
        // Set up import/restore handlers
        const fileInputs = document.querySelectorAll('[data-import]');
        fileInputs.forEach(input => {
            input.addEventListener('change', function(event) {
                const files = event.target.files;
                if (!files || files.length === 0) return;
                
                const importType = this.getAttribute('data-import');
                const file = files[0];
                
                if (importType === 'backup') {
                    restoreBackup(file)
                        .catch(error => console.error('Restore failed:', error));
                }
                
                // Reset the file input so the same file can be selected again
                this.value = '';
            });
        });
    }
    
    // Initialize on DOM ready
    document.addEventListener('DOMContentLoaded', init);
    
    // Public API
    return {
        toJSON,
        toCSV,
        toExcel,
        toPDF,
        toHTML,
        toZIP,
        withTemplate,
        createBackup,
        restoreBackup,
        generateFilename
    };
})();

// Make available globally
window.AdminExport = AdminExport;