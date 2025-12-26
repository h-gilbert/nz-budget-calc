<template>
  <div class="min-h-screen bg-gradient-to-b from-slate-50 to-white">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Header -->
      <div class="text-center mb-8">
        <h1 class="text-3xl font-bold text-slate-800">Budget Dashboard</h1>
        <p class="mt-2 text-slate-600">Track balances, plan transfers, and accelerate your goals</p>
      </div>

      <!-- Main Grid Layout -->
      <div class="grid lg:grid-cols-3 gap-6">
        <!-- Left Column: Account Overview & Upcoming Expenses -->
        <div class="lg:col-span-2 space-y-6">
          <AccountOverviewCard />
          <RegularExpenseBufferCard />
          <TransferPlanningCard />
        </div>

        <!-- Right Column: Summary & Acceleration Budget -->
        <div class="space-y-6">
          <WeeklySummaryCard />
          <AccelerationBudgetCard />

          <!-- Quick links -->
          <div class="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 space-y-4">
            <h3 class="text-sm font-semibold text-slate-700">Quick Links</h3>
            <router-link
              to="/transactions"
              class="flex items-center gap-2 text-slate-600 hover:text-teal-600 font-medium transition-colors"
            >
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M1 4a1 1 0 011-1h16a1 1 0 011 1v8a1 1 0 01-1 1H2a1 1 0 01-1-1V4zm12 4a3 3 0 11-6 0 3 3 0 016 0zM4 9a1 1 0 100-2 1 1 0 000 2zm13-1a1 1 0 11-2 0 1 1 0 012 0zM1.75 14.5a.75.75 0 000 1.5c4.417 0 8.693.603 12.749 1.73 1.111.309 2.251-.512 2.251-1.696v-.784a.75.75 0 00-1.5 0v.784a.272.272 0 01-.35.25A49.043 49.043 0 001.75 14.5z" clip-rule="evenodd" />
              </svg>
              View Transactions
            </router-link>
            <router-link
              to="/setup"
              class="flex items-center gap-2 text-slate-600 hover:text-teal-600 font-medium transition-colors"
            >
              <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M8.34 1.804A1 1 0 019.32 1h1.36a1 1 0 01.98.804l.295 1.473c.497.144.971.342 1.416.587l1.25-.834a1 1 0 011.262.125l.962.962a1 1 0 01.125 1.262l-.834 1.25c.245.445.443.919.587 1.416l1.473.294a1 1 0 01.804.98v1.361a1 1 0 01-.804.98l-1.473.295a6.95 6.95 0 01-.587 1.416l.834 1.25a1 1 0 01-.125 1.262l-.962.962a1 1 0 01-1.262.125l-1.25-.834a6.953 6.953 0 01-1.416.587l-.294 1.473a1 1 0 01-.98.804H9.32a1 1 0 01-.98-.804l-.295-1.473a6.957 6.957 0 01-1.416-.587l-1.25.834a1 1 0 01-1.262-.125l-.962-.962a1 1 0 01-.125-1.262l.834-1.25a6.957 6.957 0 01-.587-1.416l-1.473-.294A1 1 0 011 10.68V9.32a1 1 0 01.804-.98l1.473-.295c.144-.497.342-.971.587-1.416l-.834-1.25a1 1 0 01.125-1.262l.962-.962A1 1 0 015.38 3.03l1.25.834a6.957 6.957 0 011.416-.587l.294-1.473zM13 10a3 3 0 11-6 0 3 3 0 016 0z" clip-rule="evenodd" />
              </svg>
              Edit Budget Setup
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- Side Tab - Expense Chart Toggle -->
    <div
      v-if="!isChartExpanded"
      @click="isChartExpanded = true"
      class="fixed right-0 top-1/2 -translate-y-1/2 z-40 cursor-pointer
             bg-gradient-to-b from-teal-500 to-teal-600
             hover:from-teal-400 hover:to-teal-500
             shadow-lg hover:shadow-xl
             rounded-l-2xl
             px-3 py-6
             transition-all duration-200
             hover:scale-105 hover:pr-4
             group"
    >
      <span class="chart-tab-text text-white font-semibold text-sm tracking-wide
                   drop-shadow-sm group-hover:drop-shadow-md transition-all">
        Can I Cover My Expenses?
      </span>
    </div>

    <!-- Fullscreen Chart Overlay -->
    <Teleport to="body">
      <Transition name="chart-overlay">
        <div
          v-if="isChartExpanded"
          class="fixed inset-0 z-50 flex items-center justify-center"
          @keydown.escape="isChartExpanded = false"
        >
          <!-- Backdrop -->
          <div
            class="absolute inset-0 bg-black/50 backdrop-blur-sm"
            @click="isChartExpanded = false"
          />

          <!-- Content Panel -->
          <div class="relative w-full h-full max-w-[95vw] max-h-[95vh] m-4 bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col">
            <!-- Close Button -->
            <button
              @click="isChartExpanded = false"
              class="absolute top-4 right-4 z-10 p-2 rounded-xl
                     bg-slate-100 hover:bg-slate-200
                     text-slate-500 hover:text-slate-700
                     transition-colors duration-150"
            >
              <svg class="w-6 h-6" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M6.28 5.22a.75.75 0 00-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 101.06 1.06L10 11.06l3.72 3.72a.75.75 0 101.06-1.06L11.06 10l3.72-3.72a.75.75 0 00-1.06-1.06L10 8.94 6.28 5.22z" />
              </svg>
            </button>

            <!-- Chart Content -->
            <div class="flex-1 overflow-auto p-6">
              <ExpenseProjectionChart />
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import ExpenseProjectionChart from '@/components/dashboard/ExpenseProjectionChart.vue'
import AccountOverviewCard from '@/components/dashboard/AccountOverviewCard.vue'
import RegularExpenseBufferCard from '@/components/dashboard/RegularExpenseBufferCard.vue'
import TransferPlanningCard from '@/components/dashboard/TransferPlanningCard.vue'
import WeeklySummaryCard from '@/components/dashboard/WeeklySummaryCard.vue'
import AccelerationBudgetCard from '@/components/dashboard/AccelerationBudgetCard.vue'

// Chart expansion state
const isChartExpanded = ref(false)

// Handle escape key to close overlay
function handleKeydown(e) {
  if (e.key === 'Escape' && isChartExpanded.value) {
    isChartExpanded.value = false
  }
}

// Prevent body scroll when overlay is open
watch(isChartExpanded, (expanded) => {
  if (expanded) {
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', handleKeydown)
  } else {
    document.body.style.overflow = ''
    document.removeEventListener('keydown', handleKeydown)
  }
})

onUnmounted(() => {
  document.body.style.overflow = ''
  document.removeEventListener('keydown', handleKeydown)
})
</script>

<style scoped>
/* Vertical text for side tab */
.chart-tab-text {
  writing-mode: vertical-rl;
  text-orientation: mixed;
  white-space: nowrap;
}

/* Chart overlay transitions */
.chart-overlay-enter-active,
.chart-overlay-leave-active {
  transition: opacity 0.3s ease;
}

.chart-overlay-enter-active > div:last-child,
.chart-overlay-leave-active > div:last-child {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.chart-overlay-enter-from,
.chart-overlay-leave-to {
  opacity: 0;
}

.chart-overlay-enter-from > div:last-child {
  transform: translateX(100%);
  opacity: 0;
}

.chart-overlay-leave-to > div:last-child {
  transform: translateX(100%);
  opacity: 0;
}
</style>
