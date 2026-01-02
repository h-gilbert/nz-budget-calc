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
              <h2 class="text-lg font-semibold text-slate-800">Add Funds to Account</h2>
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
            <!-- Destination Account -->
            <CustomDropdown
              v-model="form.accountId"
              :options="accountOptions"
              label="Destination Account"
              placeholder="Select account..."
              required
            >
              <template #selected="{ option }">
                <div class="flex items-center justify-between w-full min-w-0 pr-2">
                  <span class="font-medium text-slate-800 truncate">{{ option.label }}</span>
                  <span class="text-sm text-slate-500 flex-shrink-0 ml-2">
                    ${{ formatAmount(option.balance) }}
                  </span>
                </div>
              </template>
              <template #option="{ option, selected }">
                <div class="flex items-center justify-between">
                  <span class="font-medium truncate" :class="selected ? 'text-teal-800' : 'text-slate-800'">
                    {{ option.label }}
                  </span>
                  <div class="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span class="text-sm" :class="selected ? 'text-teal-600' : 'text-slate-500'">
                      Balance: ${{ formatAmount(option.balance) }}
                    </span>
                    <svg
                      v-if="selected"
                      class="w-5 h-5 text-teal-600"
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path fill-rule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clip-rule="evenodd" />
                    </svg>
                  </div>
                </div>
              </template>
            </CustomDropdown>

            <!-- Amount -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Amount ($)</label>
              <input
                v-model.number="form.amount"
                type="number"
                step="0.01"
                min="0"
                class="w-full px-4 py-3 text-lg font-medium border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="0.00"
                required
              />
            </div>

            <!-- Date -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Date</label>
              <input
                v-model="form.date"
                type="date"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              />
            </div>

            <!-- Notes -->
            <div>
              <label class="block text-sm font-medium text-slate-700 mb-2">Notes (optional)</label>
              <input
                v-model="form.notes"
                type="text"
                class="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="E.g., Transfer from main account"
              />
            </div>

            <!-- Preview -->
            <div
              v-if="selectedAccount && form.amount > 0"
              class="p-4 rounded-2xl bg-emerald-50"
            >
              <div class="space-y-2">
                <div class="flex justify-between text-sm">
                  <span class="text-emerald-700">Current Balance</span>
                  <span class="font-medium text-emerald-800">
                    ${{ formatAmount(selectedAccount.balance) }}
                  </span>
                </div>
                <div class="flex justify-between text-sm">
                  <span class="text-emerald-700">Adding</span>
                  <span class="font-medium text-emerald-800">
                    +${{ formatAmount(form.amount) }}
                  </span>
                </div>
                <div class="pt-2 border-t border-emerald-200">
                  <div class="flex justify-between">
                    <span class="font-medium text-emerald-800">New Balance</span>
                    <span class="font-bold text-lg text-emerald-600">
                      ${{ formatAmount(selectedAccount.balance + form.amount) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Quick Amount Buttons -->
            <div class="flex flex-wrap gap-2">
              <button
                v-for="amount in quickAmounts"
                :key="amount"
                type="button"
                @click="form.amount = amount"
                class="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                ${{ amount }}
              </button>
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
                :disabled="saving || !form.accountId || !form.amount"
                class="flex-1 px-4 py-3 font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl transition-colors"
              >
                {{ saving ? 'Adding...' : 'Add Funds' }}
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
import { useBudgetStore } from '@/stores/budget'
import CustomDropdown from '@/components/common/CustomDropdown.vue'

const props = defineProps({
  show: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close', 'save'])

const budgetStore = useBudgetStore()
const saving = ref(false)

// Helper to format date as YYYY-MM-DD in local time (not UTC)
function formatDateLocal(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// Form state
const form = ref({
  accountId: '',
  amount: 0,
  date: formatDateLocal(new Date()),
  notes: ''
})

// Reset form when modal opens
watch(() => props.show, (isOpen) => {
  if (isOpen) {
    form.value = {
      accountId: '',
      amount: 0,
      date: formatDateLocal(new Date()),
      notes: ''
    }
  }
})

// Transform accounts into dropdown options
const accountOptions = computed(() => {
  return budgetStore.accounts.map(account => ({
    value: account.id,
    label: account.name,
    balance: account.balance || 0,
    searchTerms: account.name
  }))
})

// Format amount to 2 decimal places
function formatAmount(amount) {
  return parseFloat(amount || 0).toFixed(2)
}

// Selected account
const selectedAccount = computed(() => {
  if (!form.value.accountId) return null
  return budgetStore.accounts.find(a => a.id === form.value.accountId)
})

// Quick amount buttons
const quickAmounts = [50, 100, 200, 500]

// Handle save
async function handleSave() {
  if (!form.value.accountId || !form.value.amount) return

  saving.value = true
  try {
    emit('save', {
      accountId: form.value.accountId,
      amount: form.value.amount,
      date: form.value.date,
      notes: form.value.notes
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
