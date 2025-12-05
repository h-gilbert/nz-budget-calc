<template>
  <div class="automation-page">
    <header class="page-header">
      <div class="header-content">
        <h1>Automation Dashboard</h1>
        <p class="subtitle">Manage automatic transfers and expense payments</p>
      </div>
    </header>

    <div class="page-content">
      <AutomationDashboard />
    </div>
  </div>
</template>

<script setup>
import AutomationDashboard from '@/components/dashboard/AutomationDashboard.vue'
</script>

<style scoped>
.automation-page {
  max-width: 1400px;
  margin: 0 auto;
  padding: 2rem;
}

.page-header {
  margin-bottom: 2rem;
}

.header-content h1 {
  font-size: 2rem;
  color: var(--text-primary);
  margin: 0 0 0.5rem 0;
}

.subtitle {
  font-size: 1rem;
  color: var(--text-secondary);
  margin: 0;
}

.page-content {
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@media (max-width: 768px) {
  .automation-page {
    padding: 1rem;
  }

  .header-content h1 {
    font-size: 1.5rem;
  }

  .subtitle {
    font-size: 0.875rem;
  }
}
</style>
