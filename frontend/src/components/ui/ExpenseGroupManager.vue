<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="modelValue" class="modal-overlay" @click.self="closeModal">
        <div class="modal-content group-manager-modal">
          <button class="modal-close" @click="closeModal">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>

          <div class="modal-body">
            <div class="modal-header">
              <h2>Manage Expense Groups</h2>
              <p class="modal-subtitle">Organize your expenses into groups that match your real-world accounts</p>
            </div>

            <!-- Add New Group Form -->
            <div class="add-group-section">
              <div class="add-group-form">
                <input
                  v-model="newGroupName"
                  type="text"
                  placeholder="New group name (e.g., Cash, Bills Account)"
                  class="group-name-input"
                  @keyup.enter="createGroup"
                />
                <input
                  v-model="newGroupColor"
                  type="color"
                  class="color-picker"
                  title="Choose group color"
                />
                <button
                  class="btn-add-group"
                  :disabled="!newGroupName.trim()"
                  @click="createGroup"
                >
                  Add Group
                </button>
              </div>
            </div>

            <!-- Existing Groups List -->
            <div class="groups-list">
              <div v-if="budgetStore.expenseGroups.length === 0" class="empty-state">
                <p>No expense groups yet. Create one above to get started.</p>
              </div>

              <div
                v-for="(group, index) in budgetStore.expenseGroups"
                :key="group.id"
                class="group-item"
              >
                <div class="group-drag-handle" title="Drag to reorder">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="9" cy="6" r="2"></circle>
                    <circle cx="15" cy="6" r="2"></circle>
                    <circle cx="9" cy="12" r="2"></circle>
                    <circle cx="15" cy="12" r="2"></circle>
                    <circle cx="9" cy="18" r="2"></circle>
                    <circle cx="15" cy="18" r="2"></circle>
                  </svg>
                </div>

                <div
                  class="group-color-indicator"
                  :style="{ backgroundColor: group.color }"
                ></div>

                <div v-if="editingGroupId === group.id" class="group-edit-form">
                  <input
                    ref="editNameInput"
                    v-model="editGroupName"
                    type="text"
                    class="group-name-input inline"
                    @keyup.enter="saveGroupEdit(group.id)"
                    @keyup.escape="cancelEdit"
                  />
                  <input
                    v-model="editGroupColor"
                    type="color"
                    class="color-picker"
                  />
                  <button class="btn-save" @click="saveGroupEdit(group.id)" title="Save">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </button>
                  <button class="btn-cancel" @click="cancelEdit" title="Cancel">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>

                <div v-else class="group-info" @click="startEdit(group)">
                  <span class="group-name">{{ group.name }}</span>
                  <span class="group-expense-count">{{ getExpenseCount(group.id) }} expenses</span>
                </div>

                <div class="group-actions">
                  <button
                    v-if="editingGroupId !== group.id"
                    class="btn-icon"
                    @click="startEdit(group)"
                    title="Edit group"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                  </button>
                  <button
                    class="btn-icon btn-delete"
                    @click="confirmDelete(group)"
                    title="Delete group"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>

            <!-- Delete Confirmation -->
            <div v-if="deletingGroup" class="delete-confirmation">
              <div class="confirmation-content">
                <p>Delete group <strong>"{{ deletingGroup.name }}"</strong>?</p>
                <p class="confirmation-note">{{ getExpenseCount(deletingGroup.id) }} expenses will be moved to "Other / Ungrouped".</p>
                <div class="confirmation-actions">
                  <button class="btn-cancel-delete" @click="deletingGroup = null">Cancel</button>
                  <button class="btn-confirm-delete" @click="deleteGroup">Delete</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, nextTick } from 'vue'
import { useBudgetStore } from '@/stores/budget'

const props = defineProps({
  modelValue: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])
const budgetStore = useBudgetStore()

// New group form state
const newGroupName = ref('')
const newGroupColor = ref('#4CAF50')

// Edit state
const editingGroupId = ref(null)
const editGroupName = ref('')
const editGroupColor = ref('')
const editNameInput = ref(null)

// Delete confirmation
const deletingGroup = ref(null)

function closeModal() {
  emit('update:modelValue', false)
}

function createGroup() {
  if (!newGroupName.value.trim()) return

  budgetStore.addExpenseGroup(newGroupName.value.trim(), newGroupColor.value)
  newGroupName.value = ''
  newGroupColor.value = '#4CAF50'
}

function startEdit(group) {
  editingGroupId.value = group.id
  editGroupName.value = group.name
  editGroupColor.value = group.color
  nextTick(() => {
    editNameInput.value?.focus()
    editNameInput.value?.select()
  })
}

function saveGroupEdit(groupId) {
  if (!editGroupName.value.trim()) return

  budgetStore.updateExpenseGroup(groupId, {
    name: editGroupName.value.trim(),
    color: editGroupColor.value
  })
  editingGroupId.value = null
}

function cancelEdit() {
  editingGroupId.value = null
}

function confirmDelete(group) {
  deletingGroup.value = group
}

function deleteGroup() {
  if (!deletingGroup.value) return

  budgetStore.removeExpenseGroup(deletingGroup.value.id)
  deletingGroup.value = null
}

function getExpenseCount(groupId) {
  return budgetStore.expenses.filter(e => e.groupId === groupId).length
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content.group-manager-modal {
  background: white;
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 80vh;
  overflow: hidden;
  position: relative;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.modal-close {
  position: absolute;
  top: 16px;
  right: 16px;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  border: none;
  background: #f3f4f6;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s;
  z-index: 10;
}

.modal-close:hover {
  background: #e5e7eb;
  color: #374151;
}

.modal-body {
  padding: 24px;
  overflow-y: auto;
  max-height: calc(80vh - 48px);
}

.modal-header {
  margin-bottom: 24px;
}

.modal-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #111827;
  margin: 0 0 8px 0;
}

.modal-subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0;
}

/* Add Group Section */
.add-group-section {
  margin-bottom: 24px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.add-group-form {
  display: flex;
  gap: 12px;
  align-items: center;
}

.group-name-input {
  flex: 1;
  padding: 10px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.9375rem;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.group-name-input:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.group-name-input.inline {
  padding: 6px 10px;
}

.color-picker {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  padding: 0;
}

.color-picker::-webkit-color-swatch-wrapper {
  padding: 4px;
}

.color-picker::-webkit-color-swatch {
  border-radius: 4px;
  border: none;
}

.btn-add-group {
  padding: 10px 20px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  white-space: nowrap;
}

.btn-add-group:hover:not(:disabled) {
  background: #2563eb;
}

.btn-add-group:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

/* Groups List */
.groups-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: #6b7280;
}

.group-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f9fafb;
  border-radius: 10px;
  transition: background 0.2s;
}

.group-item:hover {
  background: #f3f4f6;
}

.group-drag-handle {
  color: #9ca3af;
  cursor: grab;
  padding: 4px;
}

.group-drag-handle:active {
  cursor: grabbing;
}

.group-color-indicator {
  width: 12px;
  height: 36px;
  border-radius: 4px;
  flex-shrink: 0;
}

.group-info {
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.group-name {
  display: block;
  font-weight: 500;
  color: #111827;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.group-expense-count {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 2px;
}

.group-edit-form {
  flex: 1;
  display: flex;
  gap: 8px;
  align-items: center;
}

.group-actions {
  display: flex;
  gap: 4px;
}

.btn-icon {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: transparent;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s;
}

.btn-icon:hover {
  background: #e5e7eb;
  color: #374151;
}

.btn-icon.btn-delete:hover {
  background: #fef2f2;
  color: #ef4444;
}

.btn-save {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: #10b981;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: background 0.2s;
}

.btn-save:hover {
  background: #059669;
}

.btn-cancel {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  border: none;
  background: #e5e7eb;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #d1d5db;
  color: #374151;
}

/* Delete Confirmation */
.delete-confirmation {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1001;
}

.confirmation-content {
  background: white;
  border-radius: 12px;
  padding: 24px;
  max-width: 400px;
  text-align: center;
}

.confirmation-content p {
  margin: 0 0 8px 0;
  color: #111827;
}

.confirmation-note {
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 20px !important;
}

.confirmation-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.btn-cancel-delete {
  padding: 8px 20px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  color: #374151;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-cancel-delete:hover {
  background: #f3f4f6;
}

.btn-confirm-delete {
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: #ef4444;
  color: white;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-confirm-delete:hover {
  background: #dc2626;
}

/* Modal Transitions */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.3s ease;
}

.modal-enter-active .modal-content,
.modal-leave-active .modal-content {
  transition: transform 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
  transform: scale(0.95) translateY(-20px);
}
</style>
