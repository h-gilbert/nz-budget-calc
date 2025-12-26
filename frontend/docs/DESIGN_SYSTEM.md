# NZ Budget Calculator - Design System

A comprehensive atomic design system for the NZ Budget Calculator application.

## Table of Contents

- [Overview](#overview)
- [Design Tokens](#design-tokens)
- [Components](#components)
- [Patterns](#patterns)
- [Usage Guidelines](#usage-guidelines)

---

## Overview

This design system follows the **Atomic Design** methodology:

1. **Atoms** - Basic building blocks (buttons, inputs, icons)
2. **Molecules** - Simple component combinations (form fields, badges with labels)
3. **Organisms** - Complex UI sections (modals, drawers, data lists)
4. **Templates** - Page layouts
5. **Pages** - Specific page instances

### Key Principles

- **Consistency** - Single source of truth for all design tokens
- **Accessibility** - Focus states, color contrast, keyboard navigation
- **Responsiveness** - Mobile-first approach with graceful scaling
- **Performance** - Minimal CSS, scoped styles, tree-shakeable components

---

## Design Tokens

All design tokens are defined in `/src/styles/design-system/tokens/`.

### Colors

```css
/* Primary Palette */
--color-teal-500: #14b8a6;    /* Primary brand color */
--color-blue-500: #3b82f6;    /* Secondary accent */
--color-purple-500: #8b5cf6;  /* Tertiary accent */

/* Semantic Colors */
--color-success: #10b981;     /* Green - positive actions */
--color-warning: #f59e0b;     /* Amber - caution */
--color-error: #ef4444;       /* Red - errors/danger */

/* Gradients */
--gradient-primary: linear-gradient(135deg, var(--color-teal-500), var(--color-blue-500));
```

### Spacing

Based on a 4px grid system:

```css
--space-1: 0.25rem;   /* 4px */
--space-2: 0.5rem;    /* 8px */
--space-3: 0.75rem;   /* 12px */
--space-4: 1rem;      /* 16px */
--space-6: 1.5rem;    /* 24px */
--space-8: 2rem;      /* 32px */
--space-12: 3rem;     /* 48px */
```

### Typography

```css
--font-family-sans: 'Inter', system-ui, sans-serif;
--font-family-mono: 'JetBrains Mono', monospace;

--font-size-xs: 0.75rem;    /* 12px */
--font-size-sm: 0.875rem;   /* 14px */
--font-size-base: 1rem;     /* 16px */
--font-size-md: 1.125rem;   /* 18px */
--font-size-lg: 1.25rem;    /* 20px */
--font-size-xl: 1.5rem;     /* 24px */
--font-size-2xl: 2rem;      /* 32px */
```

### Borders & Shadows

```css
--radius-sm: 6px;
--radius-md: 12px;
--radius-lg: 16px;
--radius-xl: 20px;
--radius-full: 9999px;

--shadow-sm: 0 1px 2px rgba(0, 0, 0, 0.05);
--shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);
--shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);
--shadow-focus: 0 0 0 3px rgba(20, 184, 166, 0.15);
```

### Motion

```css
--duration-fast: 150ms;
--duration-base: 200ms;
--duration-slow: 300ms;
--ease-out: cubic-bezier(0, 0, 0.2, 1);
```

---

## Components

### Atoms

#### BaseButton

A versatile button component with multiple variants.

```vue
<BaseButton variant="primary" size="md" :loading="false">
  Click me
</BaseButton>
```

**Props:**
| Prop | Type | Default | Options |
|------|------|---------|---------|
| `variant` | String | `'primary'` | `primary`, `secondary`, `success`, `danger`, `warning`, `outline`, `ghost`, `link` |
| `size` | String | `'md'` | `sm`, `md`, `lg` |
| `loading` | Boolean | `false` | - |
| `disabled` | Boolean | `false` | - |
| `block` | Boolean | `false` | Full-width |
| `iconOnly` | Boolean | `false` | Icon-only button |

**Slots:**
- `default` - Button content
- `icon-left` - Icon before text
- `icon-right` - Icon after text

---

#### BaseInput

A basic input element with size variants.

```vue
<BaseInput v-model="value" size="md" placeholder="Enter text..." />
```

**Props:**
| Prop | Type | Default |
|------|------|---------|
| `modelValue` | String/Number | `''` |
| `type` | String | `'text'` |
| `size` | String | `'md'` |
| `error` | Boolean | `false` |
| `disabled` | Boolean | `false` |

---

#### BaseIcon

SVG icon wrapper with consistent sizing.

```vue
<BaseIcon name="check" size="md" />
```

---

#### BaseSpinner

Loading spinner with customizable size and color.

```vue
<BaseSpinner size="md" color="var(--color-teal-500)" />
```

---

#### BaseBadge

Status badges for labels and tags.

```vue
<BaseBadge variant="success" size="md" rounded>
  Active
</BaseBadge>
```

**Props:**
| Prop | Type | Default | Options |
|------|------|---------|---------|
| `variant` | String | `'default'` | `default`, `primary`, `success`, `warning`, `danger`, `info` |
| `size` | String | `'md'` | `sm`, `md`, `lg` |
| `rounded` | Boolean | `false` | Pill shape |
| `outline` | Boolean | `false` | Outline style |

---

### Molecules

#### FormField

Complete form field with label, input, and validation.

```vue
<FormField
  v-model="email"
  label="Email"
  type="email"
  placeholder="you@example.com"
  :error="errors.email"
  required
/>
```

**Props:**
| Prop | Type | Default |
|------|------|---------|
| `modelValue` | String/Number | `''` |
| `label` | String | `''` |
| `type` | String | `'text'` |
| `placeholder` | String | `''` |
| `error` | String | `''` |
| `help` | String | `''` |
| `required` | Boolean | `false` |
| `disabled` | Boolean | `false` |

**Slots:**
- `prefix` - Content before input
- `suffix` - Content after input

---

#### FormFieldMoney

Currency input with formatting.

```vue
<FormFieldMoney
  v-model="amount"
  label="Amount"
  currency="NZD"
/>
```

---

#### FormFieldCheckbox

Toggle/checkbox input.

```vue
<FormFieldCheckbox
  v-model="agreed"
  label="I agree to the terms"
/>
```

---

#### FormFieldSelect

Custom dropdown select.

```vue
<FormFieldSelect
  v-model="country"
  label="Country"
  :options="[
    { value: 'nz', label: 'New Zealand' },
    { value: 'au', label: 'Australia' }
  ]"
/>
```

---

### Organisms

#### BaseModal

Centered modal dialog.

```vue
<BaseModal v-model="isOpen" title="Edit Profile" size="medium">
  <template #icon>
    <UserIcon />
  </template>

  <!-- Modal content -->

  <template #footer>
    <BaseButton variant="secondary" @click="isOpen = false">Cancel</BaseButton>
    <BaseButton variant="primary" @click="save">Save</BaseButton>
  </template>
</BaseModal>
```

**Props:**
| Prop | Type | Default | Options |
|------|------|---------|---------|
| `modelValue` | Boolean | `false` | - |
| `title` | String | `''` | - |
| `size` | String | `'medium'` | `small`, `medium`, `large` |
| `showHeader` | Boolean | `true` | - |
| `showCloseButton` | Boolean | `true` | - |
| `persistent` | Boolean | `false` | Prevent close on overlay click |

---

#### BaseDrawer

Slide-in panel for forms and details.

```vue
<BaseDrawer v-model="isOpen" position="left" size="md" title="Add Expense">
  <!-- Drawer content -->
</BaseDrawer>
```

**Props:**
| Prop | Type | Default | Options |
|------|------|---------|---------|
| `modelValue` | Boolean | `false` | - |
| `position` | String | `'left'` | `left`, `right` |
| `size` | String | `'md'` | `sm`, `md`, `lg`, `full` |
| `title` | String | `''` | - |
| `persistent` | Boolean | `false` | - |

---

#### ConfirmDialog

Confirmation overlay for destructive actions.

```vue
<ConfirmDialog
  v-model="showConfirm"
  title="Delete Item?"
  message="This action cannot be undone."
  variant="danger"
  confirm-text="Delete"
  @confirm="handleDelete"
/>
```

**Props:**
| Prop | Type | Default | Options |
|------|------|---------|---------|
| `variant` | String | `'info'` | `info`, `warning`, `danger` |
| `title` | String | `'Confirm'` | - |
| `message` | String | `''` | - |
| `confirmText` | String | `'Confirm'` | - |
| `cancelText` | String | `'Cancel'` | - |
| `loading` | Boolean | `false` | - |

---

#### DataList

Reusable list with add/edit/delete actions.

```vue
<DataList
  :items="expenses"
  title="Expenses"
  item-key="id"
  @add="handleAdd"
  @edit="handleEdit"
  @delete="handleDelete"
>
  <template #item="{ item }">
    <span>{{ item.name }}</span>
    <span>${{ item.amount }}</span>
  </template>
</DataList>
```

---

#### EmptyState

Placeholder for empty content areas.

```vue
<EmptyState
  title="No expenses yet"
  description="Add your first expense to start tracking."
  action-text="Add Expense"
  action-icon="plus"
  @action="handleAdd"
/>
```

---

## Patterns

### Hover States

Interactive elements use a consistent hover pattern:

```css
.interactive:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: var(--shadow-hover);
  border-color: var(--color-teal-500);
}
```

### Focus States

All focusable elements have visible focus rings:

```css
.focusable:focus-visible {
  outline: none;
  box-shadow: var(--shadow-focus);
  border-color: var(--color-teal-500);
}
```

### Form Validation

Error states use red color indicators:

```css
.form-input.has-error {
  border-color: var(--color-error);
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.15);
}
```

### Loading States

- Buttons show a spinner and become disabled
- Page sections use skeleton placeholders
- Maintain layout dimensions during loading

---

## Usage Guidelines

### Importing Components

```javascript
// Atoms
import BaseButton from '@/components/atoms/BaseButton.vue'
import BaseInput from '@/components/atoms/BaseInput.vue'
import BaseBadge from '@/components/atoms/BaseBadge.vue'

// Molecules
import FormField from '@/components/molecules/FormField.vue'
import FormFieldMoney from '@/components/molecules/FormFieldMoney.vue'
import FormFieldSelect from '@/components/molecules/FormFieldSelect.vue'

// Organisms
import BaseModal from '@/components/ui/BaseModal.vue'
import BaseDrawer from '@/components/organisms/BaseDrawer.vue'
import ConfirmDialog from '@/components/organisms/ConfirmDialog.vue'
```

### Style Guide

View the interactive style guide at `/styleguide` (development only).

### CSS Variables

Always use design tokens instead of hardcoded values:

```css
/* Good */
.my-component {
  padding: var(--space-4);
  color: var(--color-text-primary);
  border-radius: var(--radius-md);
}

/* Bad */
.my-component {
  padding: 16px;
  color: #1f2937;
  border-radius: 12px;
}
```

---

## File Structure

```
frontend/src/
├── components/
│   ├── atoms/
│   │   ├── BaseButton.vue
│   │   ├── BaseIcon.vue
│   │   ├── BaseInput.vue
│   │   ├── BaseBadge.vue
│   │   └── BaseSpinner.vue
│   ├── molecules/
│   │   ├── FormField.vue
│   │   ├── FormFieldMoney.vue
│   │   ├── FormFieldCheckbox.vue
│   │   └── FormFieldSelect.vue
│   ├── organisms/
│   │   ├── BaseDrawer.vue
│   │   ├── ConfirmDialog.vue
│   │   ├── DataList.vue
│   │   └── EmptyState.vue
│   └── ui/
│       └── BaseModal.vue
├── styles/
│   └── design-system/
│       ├── _index.css
│       ├── tokens/
│       │   ├── _colors.css
│       │   ├── _typography.css
│       │   ├── _spacing.css
│       │   ├── _borders.css
│       │   ├── _shadows.css
│       │   └── _motion.css
│       └── primitives/
│           ├── _reset.css
│           └── _base.css
└── views/
    └── StyleGuide.vue
```

---

## Contributing

1. Always use design tokens for new styles
2. Follow the atomic design hierarchy
3. Add new components to the style guide
4. Test accessibility with keyboard navigation
5. Ensure mobile responsiveness
