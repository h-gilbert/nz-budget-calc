<template>
  <div class="landing-page min-h-screen bg-gradient-to-b from-slate-50 via-white to-teal-50/30 overflow-hidden">
    <!-- Floating Background Blobs -->
    <div class="fixed inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
      <div class="blob blob-mint"></div>
      <div class="blob blob-lavender"></div>
      <div class="blob blob-peach"></div>
      <div class="blob blob-sky"></div>
    </div>

    <!-- Hero Section -->
    <section class="relative pt-12 pb-20 sm:pt-20 sm:pb-32">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="text-center max-w-3xl mx-auto">
          <!-- Badge -->
          <div class="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-teal-100 shadow-sm mb-8 animate-fade-in">
            <span class="flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-teal-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-teal-500"></span>
            </span>
            <span class="text-sm font-medium text-teal-700">Built for New Zealand</span>
          </div>

          <!-- Main Headline -->
          <h1 class="hero-headline text-5xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight mb-6 animate-fade-in-up">
            <span class="block text-slate-800">NZ Budget</span>
            <span class="block gradient-text">Calculator</span>
          </h1>

          <!-- Subheadline -->
          <p class="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in-up animation-delay-100">
            Calculate your <span class="text-teal-600 font-semibold">take-home pay</span> with NZ tax rates,
            add your expenses, and see how much you have left to spend each week.
          </p>

          <!-- CTA Buttons -->
          <div class="flex flex-col sm:flex-row gap-4 justify-center items-center animate-fade-in-up animation-delay-200">
            <router-link to="/setup" class="w-full sm:w-auto">
              <AppButton size="lg" class="w-full sm:w-auto group">
                Get Started
                <template #icon-right>
                  <svg class="w-5 h-5 transition-transform group-hover:translate-x-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd" />
                  </svg>
                </template>
              </AppButton>
            </router-link>
            <AppButton variant="secondary" size="lg" @click="viewDemo" class="w-full sm:w-auto">
              <template #icon-left>
                <svg class="w-5 h-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path d="M10 12.5a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
                  <path fill-rule="evenodd" d="M.664 10.59a1.651 1.651 0 010-1.186A10.004 10.004 0 0110 3c4.257 0 7.893 2.66 9.336 6.41.147.381.146.804 0 1.186A10.004 10.004 0 0110 17c-4.257 0-7.893-2.66-9.336-6.41zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clip-rule="evenodd" />
                </svg>
              </template>
              View Demo
            </AppButton>
          </div>

          <!-- Info Indicator -->
          <div class="mt-12 flex flex-wrap justify-center gap-6 text-sm text-slate-500 animate-fade-in-up animation-delay-300">
            <div class="flex items-center gap-2">
              <svg class="w-5 h-5 text-teal-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                <path d="M15.98 1.804a1 1 0 00-1.96 0l-.24 1.192a1 1 0 01-.784.785l-1.192.238a1 1 0 000 1.962l1.192.238a1 1 0 01.785.785l.238 1.192a1 1 0 001.962 0l.238-1.192a1 1 0 01.785-.785l1.192-.238a1 1 0 000-1.962l-1.192-.238a1 1 0 01-.785-.785l-.238-1.192zM6.949 5.684a1 1 0 00-1.898 0l-.683 2.051a1 1 0 01-.633.633l-2.051.683a1 1 0 000 1.898l2.051.684a1 1 0 01.633.632l.683 2.051a1 1 0 001.898 0l.683-2.051a1 1 0 01.633-.633l2.051-.683a1 1 0 000-1.898l-2.051-.683a1 1 0 01-.633-.633L6.95 5.684zM13.949 13.684a1 1 0 00-1.898 0l-.184.551a1 1 0 01-.632.633l-.551.183a1 1 0 000 1.898l.551.183a1 1 0 01.633.633l.183.551a1 1 0 001.898 0l.184-.551a1 1 0 01.632-.633l.551-.183a1 1 0 000-1.898l-.551-.184a1 1 0 01-.633-.632l-.183-.551z" />
              </svg>
              <span>Uses NZ Tax Rates 2025/26</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="relative py-20 sm:py-28">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <!-- Section Header -->
        <div class="text-center mb-16">
          <h2 class="text-3xl sm:text-4xl font-bold text-slate-800 mb-4">
            <span class="gradient-text">Features</span>
          </h2>
        </div>

        <!-- Feature Cards -->
        <div class="grid md:grid-cols-2 gap-6 lg:gap-8">
          <!-- NZ Tax Calculator -->
          <div class="feature-card group">
            <div class="feature-icon bg-gradient-to-br from-teal-400 to-teal-600">
              <svg class="w-7 h-7 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 7.5a2.25 2.25 0 100 4.5 2.25 2.25 0 000-4.5z" />
                <path fill-rule="evenodd" d="M1.5 4.875C1.5 3.839 2.34 3 3.375 3h17.25c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875H3.375A1.875 1.875 0 011.5 14.625v-9.75zM8.25 9.75a3.75 3.75 0 117.5 0 3.75 3.75 0 01-7.5 0zM18.75 9a.75.75 0 00-.75.75v.008c0 .414.336.75.75.75h.008a.75.75 0 00.75-.75V9.75a.75.75 0 00-.75-.75h-.008zM4.5 9.75A.75.75 0 015.25 9h.008a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75H5.25a.75.75 0 01-.75-.75V9.75z" clip-rule="evenodd" />
                <path d="M2.25 18a.75.75 0 000 1.5c5.4 0 10.63.722 15.6 2.075 1.19.324 2.4-.558 2.4-1.82V18.75a.75.75 0 00-.75-.75H2.25z" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-slate-800 mb-2">NZ Tax Calculator</h3>
            <p class="text-slate-600 mb-4">
              Calculates PAYE, ACC levies, KiwiSaver contributions, and Student Loan repayments using current NZ tax rates.
            </p>
            <div class="flex flex-wrap gap-2">
              <span class="feature-tag">PAYE</span>
              <span class="feature-tag">ACC</span>
              <span class="feature-tag">KiwiSaver</span>
              <span class="feature-tag">Student Loan</span>
              <span class="feature-tag">IETC</span>
            </div>
          </div>

          <!-- Expense Tracking -->
          <div class="feature-card group">
            <div class="feature-icon bg-gradient-to-br from-violet-400 to-violet-600">
              <svg class="w-7 h-7 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M7.502 6h7.128A3.375 3.375 0 0118 9.375v9.375a3 3 0 003-3V6.108c0-1.505-1.125-2.811-2.664-2.94a48.972 48.972 0 00-.673-.05A3 3 0 0015 1.5h-1.5a3 3 0 00-2.663 1.618c-.225.015-.45.032-.673.05C8.662 3.295 7.554 4.542 7.502 6zM13.5 3A1.5 1.5 0 0012 4.5h4.5A1.5 1.5 0 0015 3h-1.5z" clip-rule="evenodd" />
                <path fill-rule="evenodd" d="M3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875v11.25c0 1.035-.84 1.875-1.875 1.875h-9.75A1.875 1.875 0 013 20.625V9.375zm9.586 4.594a.75.75 0 00-1.172-.938l-2.476 3.096-.908-.907a.75.75 0 00-1.06 1.06l1.5 1.5a.75.75 0 001.116-.062l3-3.75z" clip-rule="evenodd" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-slate-800 mb-2">Expense Tracking</h3>
            <p class="text-slate-600 mb-4">
              Add your bills and recurring expenses. Supports weekly, fortnightly, monthly, or annual frequencies.
            </p>
            <div class="flex flex-wrap gap-2">
              <span class="feature-tag">Flexible Frequencies</span>
              <span class="feature-tag">Categories</span>
              <span class="feature-tag">Groups</span>
            </div>
          </div>

          <!-- Weekly Spending Power -->
          <div class="feature-card group">
            <div class="feature-icon bg-gradient-to-br from-amber-400 to-orange-500">
              <svg class="w-7 h-7 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clip-rule="evenodd" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-slate-800 mb-2">Weekly Spending Power</h3>
            <p class="text-slate-600 mb-4">
              See how much you have left to spend each week after all bills and expenses.
            </p>
            <div class="flex flex-wrap gap-2">
              <span class="feature-tag">Real-time</span>
              <span class="feature-tag">After Expenses</span>
              <span class="feature-tag">Weekly View</span>
            </div>
          </div>

          <!-- Easy to Use -->
          <div class="feature-card group">
            <div class="feature-icon bg-gradient-to-br from-rose-400 to-pink-500">
              <svg class="w-7 h-7 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-slate-800 mb-2">Simple Interface</h3>
            <p class="text-slate-600 mb-4">
              Enter your income and expenses, see results instantly. Optional login to save your data.
            </p>
            <div class="flex flex-wrap gap-2">
              <span class="feature-tag">No Signup Required</span>
              <span class="feature-tag">Instant Results</span>
              <span class="feature-tag">Save Progress</span>
            </div>
          </div>
        </div>

        <!-- Bottom CTA -->
        <div class="text-center mt-16">
          <router-link to="/setup">
            <AppButton size="lg" class="group">
              Get Started
              <template #icon-right>
                <svg class="w-5 h-5 transition-transform group-hover:translate-x-1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fill-rule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clip-rule="evenodd" />
                </svg>
              </template>
            </AppButton>
          </router-link>
        </div>
      </div>
    </section>

    <!-- Footer -->
    <footer class="relative py-8 border-t border-slate-200/60">
      <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div class="flex items-center gap-2 text-slate-500 text-sm">
            <span>&copy; {{ new Date().getFullYear() }} NZ Budget Calculator</span>
          </div>
          <div class="text-sm text-slate-400">
            Tax calculations updated for 2025/2026
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import AppButton from '@/components/common/AppButton.vue'
import { useBudgetStore } from '@/stores/budget'

const router = useRouter()
const budgetStore = useBudgetStore()

async function viewDemo() {
  await budgetStore.loadDemoData()
  router.push('/dashboard')
}
</script>

<style scoped>
@reference "tailwindcss";

/* Gradient Text */
.gradient-text {
  background: linear-gradient(135deg, #14b8a6 0%, #0891b2 50%, #6366f1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Floating Blobs */
.blob {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.6;
  animation: float 20s ease-in-out infinite;
}

.blob-mint {
  width: 500px;
  height: 500px;
  background: linear-gradient(135deg, #a7f3d0 0%, #6ee7b7 100%);
  top: -10%;
  left: -10%;
  animation-delay: 0s;
}

.blob-lavender {
  width: 450px;
  height: 450px;
  background: linear-gradient(135deg, #e9d5ff 0%, #c4b5fd 100%);
  top: 20%;
  right: -15%;
  animation-delay: -5s;
}

.blob-peach {
  width: 400px;
  height: 400px;
  background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
  bottom: 10%;
  left: 20%;
  animation-delay: -10s;
}

.blob-sky {
  width: 350px;
  height: 350px;
  background: linear-gradient(135deg, #bae6fd 0%, #7dd3fc 100%);
  bottom: 30%;
  right: 10%;
  animation-delay: -15s;
}

@keyframes float {
  0%, 100% {
    transform: translate(0, 0) scale(1);
  }
  25% {
    transform: translate(30px, -40px) scale(1.05);
  }
  50% {
    transform: translate(-20px, 20px) scale(0.95);
  }
  75% {
    transform: translate(-30px, -20px) scale(1.02);
  }
}

/* Feature Cards */
.feature-card {
  @apply relative bg-white/70 backdrop-blur-sm rounded-3xl p-8 border border-white/50;
  box-shadow:
    0 4px 24px -4px rgba(0, 0, 0, 0.04),
    0 0 0 1px rgba(255, 255, 255, 0.8) inset;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow:
    0 20px 40px -12px rgba(0, 0, 0, 0.1),
    0 0 0 1px rgba(255, 255, 255, 0.9) inset;
}

.feature-icon {
  @apply w-14 h-14 rounded-2xl flex items-center justify-center mb-5;
  box-shadow: 0 8px 24px -8px currentColor;
}

.feature-tag {
  @apply px-3 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600;
}

/* Animations */
.animate-fade-in {
  animation: fadeIn 0.8s ease-out forwards;
}

.animate-fade-in-up {
  animation: fadeInUp 0.8s ease-out forwards;
}

.animation-delay-100 {
  animation-delay: 0.1s;
  opacity: 0;
}

.animation-delay-200 {
  animation-delay: 0.2s;
  opacity: 0;
}

.animation-delay-300 {
  animation-delay: 0.3s;
  opacity: 0;
}

@keyframes fadeIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Responsive blob adjustments */
@media (max-width: 768px) {
  .blob {
    filter: blur(60px);
    opacity: 0.4;
  }

  .blob-mint {
    width: 300px;
    height: 300px;
  }

  .blob-lavender {
    width: 280px;
    height: 280px;
  }

  .blob-peach {
    width: 250px;
    height: 250px;
  }

  .blob-sky {
    width: 220px;
    height: 220px;
  }
}
</style>
