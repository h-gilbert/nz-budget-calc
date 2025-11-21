/**
 * Toast Notification System
 * Provides non-intrusive notifications to replace browser alerts
 */

export const Toast = {
    container: null,

    init: function() {
        this.container = document.getElementById('toast-container');
        if (!this.container) {
            console.warn('Toast container not found in DOM');
        }
    },

    show: function(type, title, message, duration = 5000) {
        if (!this.container) {
            console.error('Toast container not initialized');
            return null;
        }

        // Create toast element
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;

        // Build toast HTML
        toast.innerHTML = `
            <div class="toast-icon">
                ${this.getIcon(type)}
            </div>
            <div class="toast-content">
                <div class="toast-title">${this.escapeHtml(title)}</div>
                ${message ? `<div class="toast-message">${this.escapeHtml(message)}</div>` : ''}
            </div>
            <button class="toast-close" aria-label="Close">&times;</button>
        `;

        // Add to container
        this.container.appendChild(toast);

        // Close button handler
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.remove(toast);
        });

        // Auto-dismiss
        if (duration > 0) {
            setTimeout(() => this.remove(toast), duration);
        }

        return toast;
    },

    remove: function(toast) {
        if (!toast) return;

        toast.classList.add('removing');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.remove();
            }
        }, 300);
    },

    getIcon: function(type) {
        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };
        return icons[type] || icons.info;
    },

    escapeHtml: function(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    success: function(title, message, duration) {
        return this.show('success', title, message, duration);
    },

    error: function(title, message, duration) {
        return this.show('error', title, message, duration);
    },

    warning: function(title, message, duration) {
        return this.show('warning', title, message, duration);
    },

    info: function(title, message, duration) {
        return this.show('info', title, message, duration);
    },

    /**
     * Custom confirm dialog using toast with callbacks
     * @param {string} title - Dialog title
     * @param {string} message - Dialog message
     * @param {function} onConfirm - Callback for confirm action
     * @param {function} onCancel - Optional callback for cancel action
     */
    confirm: function(title, message, onConfirm, onCancel) {
        const toast = document.createElement('div');
        toast.className = 'toast warning toast-confirm';

        toast.innerHTML = `
            <div class="toast-icon">⚠</div>
            <div class="toast-content">
                <div class="toast-title">${this.escapeHtml(title)}</div>
                ${message ? `<div class="toast-message">${this.escapeHtml(message)}</div>` : ''}
                <div class="toast-actions">
                    <button class="btn-confirm btn-primary btn-small">Confirm</button>
                    <button class="btn-cancel btn-secondary btn-small">Cancel</button>
                </div>
            </div>
        `;

        this.container.appendChild(toast);

        // Confirm button handler
        toast.querySelector('.btn-confirm').addEventListener('click', () => {
            if (onConfirm) onConfirm();
            this.remove(toast);
        });

        // Cancel button handler
        toast.querySelector('.btn-cancel').addEventListener('click', () => {
            if (onCancel) onCancel();
            this.remove(toast);
        });

        return toast;
    }
};
