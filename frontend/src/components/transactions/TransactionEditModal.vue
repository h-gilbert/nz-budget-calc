<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="show"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
        @keydown.escape="$emit('close')"
      >
        <!-- Backdrop -->
        <div
          class="absolute inset-0 bg-black/50 backdrop-blur-sm"
          @click="$emit('close')"
        />

        <!-- Modal Content -->
        <div class="relative w-full max-w-md bg-white rounded-3xl shadow-xl overflow-hidden">
          <!-- Header -->
          <div class="px-6 py-4 border-b border-gray-100">
            <div class="flex items-center justify-between">
              <h2 class="text-lg font-semibold text-slate-800">Edit Transaction</h2>
              <button
                @click="$emit('close')"
                class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSave" class="p-6 space-y-4">
            <!-- Transaction Info (Read Only) -->
            <div class="p-4 bg-slate-50 rounded-2xl space-y-2">
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Type</span>
                <span class="font-medium text-slate-700 capitalize">{{ transaction?.transaction_type }}</span>
              </div>
              <div class="flex justify-between text-sm">
                <span class="text-slate-500">Date</span>
                <span class="font-medium text-slate-700">{{ formattedDate }}</span>
              </div>
              <div v-if="transaction?.category" class="flex justify-between text-sm">
                <span class="text-slate-500">Category</span>
                <span class="font-medium text-slate-700">{{ transaction.category }}</span>
              </div>
            </div>

            <!-- Amount -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Amount ($)</label>
              <input
                v-model.number="form.amount"
                type="number"
                step="0.01"
                min="0"
                class="w-full px-4 py-3 text-lg font-medium border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
            </div>

            <!-- Description -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Description</label>
              <input
                v-model="form.description"
                type="text"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Notes</label>
              <textarea
                v-model="form.notes"
                rows="3"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
                placeholder="Add any notes..."
              ></textarea>
            </div>

            <!-- Budget Comparison (for expenses with budget) -->
            <div
              v-if="transaction?.budget_amount"
              class="p-4 rounded-2xl"
              :class="variance > 0 ? 'bg-red-50' : 'bg-green-50'"
            >
              <div class="flex justify-between items-center">
                <span class="text-sm font-medium" :class="variance > 0 ? 'text-red-700' : 'text-green-700'">
                  {{ variance > 0 ? 'Over budget by' : 'Under budget by' }}
                </span>
                <span class="text-lg font-bold" :class="variance > 0 ? 'text-red-600' : 'text-green-600'">
                  ${{ Math.abs(variance).toFixed(2) }}
                </span>
              </div>
              <p class="text-xs mt-1" :class="variance > 0 ? 'text-red-600' : 'text-green-600'">
                Budget: ${{ parseFloat(transaction.budget_amount).toFixed(2) }}
              </p>
            </div>

            <!-- Actions -->
            <div class="flex gap-3 pt-2">
              <button
                type="button"
                @click="$emit('close')"
                class="flex-1 px-4 py-3 font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                :disabled="saving"
                class="flex-1 px-4 py-3 font-medium text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50 rounded-xl transition-colors"
              >
                {{ saving ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  },
  transaction: {
    type: Object,
    default: null
  }
})

const emit = defineEmits(['close', 'save'])

const saving = ref(false)
const form = ref({
  amount: 0,
  description: '',
  notes: ''
})

// Watch for transaction changes
watch(() => props.transaction, (newVal) => {
  if (newVal) {
    form.value = {
      amount: parseFloat(newVal.amount) || 0,
      description: newVal.description || '',
      notes: newVal.notes || ''
    }
  }
}, { immediate: true })

// Formatted date
const formattedDate = computed(() => {
  if (!props.transaction?.transaction_date) return ''
  return new Date(props.transaction.transaction_date).toLocaleDateString('en-NZ', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
})

// Variance calculation
const variance = computed(() => {
  if (!props.transaction?.budget_amount) return 0
  return form.value.amount - parseFloat(props.transaction.budget_amount)
})

// Handle save
async function handleSave() {
  saving.value = true
  try {
    emit('save', {
      id: props.transaction.id,
      updates: {
        amount: form.value.amount,
        description: form.value.description,
        notes: form.value.notes
      }
    })
  } finally {
    saving.value = false
  }
}
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: all 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .relative,
.modal-leave-to .relative {
  transform: scale(0.95);
}
</style>
