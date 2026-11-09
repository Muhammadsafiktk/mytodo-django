/**
 * Focus — Todo App
 * Vanilla JS with fetch API, drag-and-drop, filtering, theme toggle
 */

(function () {
    'use strict';

    // ---- DOM refs ----
    const taskList = document.getElementById('taskList');
    const emptyState = document.getElementById('emptyState');
    const todoForm = document.getElementById('todoForm');
    const expandBtn = document.getElementById('expandForm');
    const formDetails = document.getElementById('formDetails');
    const searchInput = document.getElementById('searchInput');
    const filterPills = document.querySelectorAll('.filter-pill');
    const themeToggle = document.getElementById('themeToggle');
    const editModal = document.getElementById('editModal');
    const editForm = document.getElementById('editForm');
    const toastContainer = document.getElementById('toastContainer');
    const totalCountEl = document.getElementById('totalCount');
    const activeCountEl = document.getElementById('activeCount');
    const completedCountEl = document.getElementById('completedCount');

    let currentFilter = 'all';
    let searchQuery = '';
    let dragSrcEl = null;

    // ---- Theme ----
    function initTheme() {
        const saved = localStorage.getItem('focus-theme') || 
            (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
        setTheme(saved);
    }

    function setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('focus-theme', theme);
    }

    themeToggle.addEventListener('click', () => {
        const current = document.documentElement.getAttribute('data-theme');
        setTheme(current === 'dark' ? 'light' : 'dark');
    });

    // ---- Helpers ----
    function getCookie(name) {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop().split(';').shift();
        return window.CSRF_TOKEN || '';
    }

    function csrfHeaders() {
        return {
            'X-CSRFToken': getCookie('csrftoken') || window.CSRF_TOKEN,
            'X-Requested-With': 'XMLHttpRequest',
            'Content-Type': 'application/json',
        };
    }

    function toast(message, type = 'success') {
        const el = document.createElement('div');
        el.className = `toast ${type}`;
        el.textContent = message;
        toastContainer.appendChild(el);
        setTimeout(() => el.remove(), 3000);
    }

    function formatDate(iso) {
        if (!iso) return '';
        const d = new Date(iso + 'T00:00:00');
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function isOverdue(iso, completed) {
        if (!iso || completed) return false;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(iso + 'T00:00:00');
        return due < today;
    }

    // ---- Render task item ----
    function createTaskElement(todo) {
        const li = document.createElement('li');
        li.className = `task-item${todo.completed ? ' completed' : ''}${todo.is_overdue ? ' overdue' : ''}`;
        li.dataset.id = todo.id;
        li.dataset.priority = todo.priority;
        li.dataset.completed = todo.completed ? 'true' : 'false';
        if (todo.due_date) li.dataset.due = todo.due_date;
        li.draggable = true;

        const overdueHtml = todo.due_date
            ? `<div class="task-due${todo.is_overdue ? ' overdue' : ''}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
                </svg>
                <span>${formatDate(todo.due_date)}</span>
                ${todo.is_overdue ? '<span class="overdue-label">Overdue</span>' : ''}
               </div>`
            : '';

        const descHtml = todo.description
            ? `<p class="task-desc">${escapeHtml(todo.description)}</p>`
            : '';

        li.innerHTML = `
            <div class="task-drag" aria-hidden="true">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="6" r="1.5"/><circle cx="15" cy="6" r="1.5"/>
                    <circle cx="9" cy="12" r="1.5"/><circle cx="15" cy="12" r="1.5"/>
                    <circle cx="9" cy="18" r="1.5"/><circle cx="15" cy="18" r="1.5"/>
                </svg>
            </div>
            <label class="task-check">
                <input type="checkbox" ${todo.completed ? 'checked' : ''} aria-label="Mark as complete">
                <span class="checkmark">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                        <path d="M5 13l4 4L19 7"/>
                    </svg>
                </span>
            </label>
            <div class="task-content">
                <div class="task-title-row">
                    <span class="task-title">${escapeHtml(todo.title)}</span>
                    <span class="priority-badge priority-${todo.priority}">${todo.priority_display}</span>
                </div>
                ${descHtml}
                ${overdueHtml}
            </div>
            <div class="task-actions">
                <button class="btn-icon btn-edit" aria-label="Edit task" title="Edit">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
                <button class="btn-icon btn-delete" aria-label="Delete task" title="Delete">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                    </svg>
                </button>
            </div>
        `;

        bindTaskEvents(li);
        return li;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function bindTaskEvents(li) {
        // Toggle
        const checkbox = li.querySelector('input[type="checkbox"]');
        checkbox.addEventListener('change', () => toggleTask(li.dataset.id, li));

        // Edit
        li.querySelector('.btn-edit').addEventListener('click', () => openEditModal(li));

        // Delete
        li.querySelector('.btn-delete').addEventListener('click', () => deleteTask(li.dataset.id, li));

        // Drag
        li.addEventListener('dragstart', handleDragStart);
        li.addEventListener('dragend', handleDragEnd);
        li.addEventListener('dragover', handleDragOver);
        li.addEventListener('drop', handleDrop);
        li.addEventListener('dragenter', handleDragEnter);
        li.addEventListener('dragleave', handleDragLeave);
    }

    // Bind existing items
    document.querySelectorAll('.task-item').forEach(bindTaskEvents);

    // ---- CRUD ----
    todoForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(todoForm);
        const title = formData.get('title')?.trim();
        if (!title) return;

        try {
            const res = await fetch(window.URLS.create, {
                method: 'POST',
                headers: {
                    'X-CSRFToken': getCookie('csrftoken') || window.CSRF_TOKEN,
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: formData,
            });
            const data = await res.json();
            if (data.success) {
                const el = createTaskElement(data.todo);
                taskList.prepend(el);
                todoForm.reset();
                formDetails.classList.remove('open');
                expandBtn.setAttribute('aria-expanded', 'false');
                updateCounts();
                updateEmptyState();
                applyFilters();
                toast('Task added');
            } else {
                toast('Could not add task', 'error');
            }
        } catch {
            toast('Network error', 'error');
        }
    });

    async function toggleTask(id, li) {
        try {
            const res = await fetch(window.URLS.toggle.replace('{id}', id), {
                method: 'POST',
                headers: csrfHeaders(),
            });
            const data = await res.json();
            if (data.success) {
                li.classList.toggle('completed', data.todo.completed);
                li.dataset.completed = data.todo.completed ? 'true' : 'false';
                if (data.todo.is_overdue) {
                    li.classList.add('overdue');
                } else {
                    li.classList.remove('overdue');
                }
                // Update overdue badge visibility
                const dueEl = li.querySelector('.task-due');
                if (dueEl) {
                    dueEl.classList.toggle('overdue', data.todo.is_overdue);
                    const label = dueEl.querySelector('.overdue-label');
                    if (data.todo.is_overdue && !label) {
                        dueEl.insertAdjacentHTML('beforeend', '<span class="overdue-label">Overdue</span>');
                    } else if (!data.todo.is_overdue && label) {
                        label.remove();
                    }
                }
                updateCounts();
                applyFilters();
            }
        } catch {
            // Revert checkbox
            const cb = li.querySelector('input[type="checkbox"]');
            cb.checked = !cb.checked;
            toast('Could not update', 'error');
        }
    }

    async function deleteTask(id, li) {
        if (!confirm('Delete this task?')) return;
        try {
            const res = await fetch(window.URLS.delete.replace('{id}', id), {
                method: 'POST',
                headers: csrfHeaders(),
            });
            const data = await res.json();
            if (data.success) {
                li.style.transition = 'opacity 0.2s, transform 0.2s';
                li.style.opacity = '0';
                li.style.transform = 'translateX(20px)';
                setTimeout(() => {
                    li.remove();
                    updateCounts();
                    updateEmptyState();
                    applyFilters();
                }, 200);
                toast('Task deleted');
            }
        } catch {
            toast('Could not delete', 'error');
        }
    }

    // ---- Edit Modal ----
    function openEditModal(li) {
        const id = li.dataset.id;
        const title = li.querySelector('.task-title').textContent;
        const descEl = li.querySelector('.task-desc');
        const priority = li.dataset.priority;
        const dueEl = li.querySelector('.task-due span:not(.overdue-label)');

        document.getElementById('editId').value = id;
        document.getElementById('editTitle').value = title;
        document.getElementById('editDescription').value = descEl ? descEl.textContent : '';
        document.getElementById('editPriority').value = priority;

        // Parse due date back to YYYY-MM-DD if present
        const dueInput = document.getElementById('editDueDate');
        if (dueEl) {
            // We stored formatted date; better to keep data attribute
            // For simplicity, leave empty or try to re-parse (best effort)
            dueInput.value = li.dataset.due || '';
        } else {
            dueInput.value = li.dataset.due || '';
        }

        // Store original due from data if we had it - improve by data attr
        editModal.hidden = false;
        document.getElementById('editTitle').focus();
    }

    // Improve: store due_date on element
    function enhanceExistingItems() {
        document.querySelectorAll('.task-item').forEach(li => {
            // already have data attrs
        });
    }

    document.getElementById('closeModal').addEventListener('click', closeModal);
    document.getElementById('cancelEdit').addEventListener('click', closeModal);

    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) closeModal();
    });

    function closeModal() {
        editModal.hidden = true;
    }

    editForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('editId').value;
        const payload = {
            title: document.getElementById('editTitle').value.trim(),
            description: document.getElementById('editDescription').value.trim(),
            priority: document.getElementById('editPriority').value,
            due_date: document.getElementById('editDueDate').value || null,
        };
        if (!payload.title) return;

        try {
            const res = await fetch(window.URLS.update.replace('{id}', id), {
                method: 'POST',
                headers: csrfHeaders(),
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                const oldLi = taskList.querySelector(`[data-id="${id}"]`);
                if (oldLi) {
                    const newLi = createTaskElement(data.todo);
                    oldLi.replaceWith(newLi);
                }
                closeModal();
                applyFilters();
                toast('Task updated');
            } else {
                toast('Could not update', 'error');
            }
        } catch {
            toast('Network error', 'error');
        }
    });

    // ---- Expand form ----
    expandBtn.addEventListener('click', () => {
        const open = formDetails.classList.toggle('open');
        expandBtn.setAttribute('aria-expanded', open);
    });

    // ---- Filter & Search ----
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => {
                p.classList.remove('active');
                p.setAttribute('aria-selected', 'false');
            });
            pill.classList.add('active');
            pill.setAttribute('aria-selected', 'true');
            currentFilter = pill.dataset.filter;
            applyFilters();
        });
    });

    // Stats click = filter
    document.querySelectorAll('.stat').forEach(stat => {
        stat.addEventListener('click', () => {
            const f = stat.dataset.filter;
            filterPills.forEach(p => {
                const match = p.dataset.filter === f;
                p.classList.toggle('active', match);
                p.setAttribute('aria-selected', match);
            });
            currentFilter = f;
            applyFilters();
        });
    });

    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value.trim().toLowerCase();
        applyFilters();
    });

    function applyFilters() {
        const items = taskList.querySelectorAll('.task-item');
        let visible = 0;
        items.forEach(li => {
            const completed = li.dataset.completed === 'true';
            const title = li.querySelector('.task-title').textContent.toLowerCase();
            const desc = li.querySelector('.task-desc')?.textContent.toLowerCase() || '';

            let show = true;
            if (currentFilter === 'active' && completed) show = false;
            if (currentFilter === 'completed' && !completed) show = false;
            if (searchQuery && !title.includes(searchQuery) && !desc.includes(searchQuery)) show = false;

            li.style.display = show ? '' : 'none';
            if (show) visible++;
        });

        emptyState.style.display = (items.length === 0 || visible === 0) ? '' : 'none';
        if (items.length > 0 && visible === 0) {
            emptyState.querySelector('.empty-title').textContent = 'No matching tasks';
            emptyState.querySelector('.empty-text').textContent = 'Try a different filter or search term.';
        } else {
            emptyState.querySelector('.empty-title').textContent = 'No tasks yet';
            emptyState.querySelector('.empty-text').textContent = 'Add your first task above and start getting things done.';
        }
    }

    function updateCounts() {
        const items = taskList.querySelectorAll('.task-item');
        let total = 0, active = 0, completed = 0;
        items.forEach(li => {
            total++;
            if (li.dataset.completed === 'true') completed++;
            else active++;
        });
        totalCountEl.textContent = total;
        activeCountEl.textContent = active;
        completedCountEl.textContent = completed;
    }

    function updateEmptyState() {
        const hasItems = taskList.querySelectorAll('.task-item').length > 0;
        emptyState.style.display = hasItems ? 'none' : '';
    }

    // ---- Drag and Drop ----
    function handleDragStart(e) {
        dragSrcEl = this;
        this.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', this.dataset.id);
    }

    function handleDragEnd() {
        this.classList.remove('dragging');
        document.querySelectorAll('.task-item').forEach(el => el.classList.remove('drag-over'));
        dragSrcEl = null;
        // Persist order
        persistOrder();
    }

    function handleDragOver(e) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        return false;
    }

    function handleDragEnter(e) {
        if (this !== dragSrcEl) this.classList.add('drag-over');
    }

    function handleDragLeave() {
        this.classList.remove('drag-over');
    }

    function handleDrop(e) {
        e.stopPropagation();
        e.preventDefault();
        if (dragSrcEl && dragSrcEl !== this) {
            const items = [...taskList.querySelectorAll('.task-item')];
            const srcIndex = items.indexOf(dragSrcEl);
            const destIndex = items.indexOf(this);
            if (srcIndex < destIndex) {
                this.after(dragSrcEl);
            } else {
                this.before(dragSrcEl);
            }
        }
        this.classList.remove('drag-over');
        return false;
    }

    async function persistOrder() {
        const order = [...taskList.querySelectorAll('.task-item')].map(li => li.dataset.id);
        try {
            await fetch(window.URLS.reorder, {
                method: 'POST',
                headers: csrfHeaders(),
                body: JSON.stringify({ order }),
            });
        } catch {
            // silent
        }
    }

    // ---- Keyboard shortcuts ----
    document.addEventListener('keydown', (e) => {
        // Escape closes modal
        if (e.key === 'Escape' && !editModal.hidden) {
            closeModal();
            return;
        }
        // Focus search with /
        if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
            e.preventDefault();
            searchInput.focus();
        }
    });

    // Enter in title field already submits form via native behavior

    // ---- Init ----
    initTheme();
    updateEmptyState();
    applyFilters();
})();
