<template>
  <div class="home">
    <section class="hero">
      <div class="hero-content">
        <h1 class="hero-title">
          <span class="gradient-text">NZ Budget Calculator</span>
        </h1>
        <p class="hero-subtitle">
          Take control of your finances with smart budgeting
        </p>
        <p class="hero-description">
          Calculate your take-home pay, track expenses, and plan your savings goals with precision.
        </p>
        <div class="hero-actions">
          <router-link to="/calculator" class="btn btn-primary btn-large">
            Get Started
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </router-link>
          <button v-if="!userStore.isAuthenticated" @click="emit('openLogin')" class="btn btn-secondary btn-large">
            Login to Save Progress
          </button>
        </div>
      </div>
      <div class="hero-visual">
        <div class="visual-decoration">
          <div class="decoration-circle circle-1"></div>
          <div class="decoration-circle circle-2"></div>
          <div class="decoration-circle circle-3"></div>
        </div>
      </div>
    </section>

    <section class="features">
      <div class="container">
        <h2 class="section-title">Everything you need to budget smarter</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <h3>Accurate Tax Calculations</h3>
            <p>Precise NZ PAYE, KiwiSaver, and student loan deductions</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="5" width="20" height="14" rx="2"></rect>
                <line x1="2" y1="10" x2="22" y2="10"></line>
              </svg>
            </div>
            <h3>Expense Tracking</h3>
            <p>Track all your expenses in any frequency, automatically converted to weekly</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <path d="M12 6v6l4 2"></path>
              </svg>
            </div>
            <h3>Savings Goals</h3>
            <p>Set targets, track progress, and calculate how long it will take</p>
          </div>

          <div class="feature-card">
            <div class="feature-icon">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                <polyline points="7 3 7 8 15 8"></polyline>
              </svg>
            </div>
            <h3>Save & Restore</h3>
            <p>Login to save multiple budgets and access them from anywhere</p>
          </div>
        </div>
      </div>
    </section>

    <section class="cta">
      <div class="container">
        <div class="cta-content">
          <h2>Ready to take control of your budget?</h2>
          <p>Start planning your financial future today - no sign up required to get started</p>
          <router-link to="/calculator" class="btn btn-primary btn-large">
            Start Calculating
          </router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { useUserStore } from '@stores/user'

const userStore = useUserStore()
const emit = defineEmits(['openLogin'])
</script>

<style scoped>
.home {
  min-height: 100vh;
}

.hero {
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  align-items: center;
  padding: 8rem 2rem;
  max-width: 1200px;
  margin: 0 auto;
  overflow: hidden;
}

.hero-content {
  z-index: 2;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 1.5rem;
}

.gradient-text {
  background: linear-gradient(135deg, #14b8a6, #3b82f6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-subtitle {
  font-size: 1.5rem;
  color: var(--text-secondary);
  margin-bottom: 1rem;
  font-weight: 500;
}

.hero-description {
  font-size: 1.125rem;
  color: var(--text-secondary);
  margin-bottom: 2rem;
  line-height: 1.6;
}

.hero-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.hero-visual {
  position: relative;
  height: 400px;
}

.visual-decoration {
  position: relative;
  width: 100%;
  height: 100%;
}

.decoration-circle {
  position: absolute;
  border-radius: 50%;
  opacity: 0.1;
  animation: float 6s ease-in-out infinite;
}

.circle-1 {
  width: 300px;
  height: 300px;
  background: linear-gradient(135deg, #14b8a6, #3b82f6);
  top: 0;
  left: 0;
  animation-delay: 0s;
}

.circle-2 {
  width: 200px;
  height: 200px;
  background: linear-gradient(135deg, #f59e0b, #ef4444);
  bottom: 20%;
  right: 10%;
  animation-delay: 2s;
}

.circle-3 {
  width: 150px;
  height: 150px;
  background: linear-gradient(135deg, #8b5cf6, #ec4899);
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  animation-delay: 4s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px);
  }
  50% {
    transform: translateY(-20px);
  }
}

.features {
  padding: 6rem 2rem;
  background: var(--bg-secondary);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 3rem;
  color: var(--text-primary);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.feature-card {
  background: var(--bg-card);
  padding: 2rem;
  border-radius: 16px;
  border: 1px solid var(--border-light);
  transition: all 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 24px rgba(0, 0, 0, 0.1);
  border-color: var(--primary-teal);
}

.feature-icon {
  width: 64px;
  height: 64px;
  background: linear-gradient(135deg, var(--pastel-mint), var(--pastel-lavender));
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 1.5rem;
  color: var(--primary-teal);
}

.feature-card h3 {
  font-size: 1.25rem;
  font-weight: 600;
  margin-bottom: 0.75rem;
  color: var(--text-primary);
}

.feature-card p {
  color: var(--text-secondary);
  line-height: 1.6;
}

.cta {
  padding: 6rem 2rem;
  background: linear-gradient(135deg, var(--primary-teal), var(--primary-blue));
}

.cta-content {
  text-align: center;
  color: white;
}

.cta-content h2 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 1rem;
}

.cta-content p {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.95;
}

.cta-content .btn {
  background: white;
  color: var(--primary-teal);
}

.cta-content .btn:hover {
  background: var(--bg-secondary);
}

@media (max-width: 768px) {
  .hero {
    grid-template-columns: 1fr;
    padding: 4rem 1.5rem;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-subtitle {
    font-size: 1.25rem;
  }

  .hero-visual {
    height: 300px;
  }

  .section-title {
    font-size: 2rem;
  }

  .cta-content h2 {
    font-size: 2rem;
  }

  .hero-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .hero-actions .btn {
    width: 100%;
    justify-content: center;
  }
}
</style>
