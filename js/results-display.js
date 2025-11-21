/**
 * Results Display Module
 * Handles the rendering of budget calculation results
 * Following progressive disclosure pattern with focus on Income, Spending, and Cash Flow
 */

// Tooltip functions for interactive charts
window.showAccountTooltip = function(element, text, required, current, expenseCount) {
    const tooltip = document.getElementById('account-tooltip');
    if (!tooltip) return;

    const lines = text.split('\\n');
    let html = '';
    lines.forEach((line, index) => {
        if (index === 0) {
            html += `<div style="font-weight: bold; margin-bottom: 0.5rem; border-bottom: 1px solid rgba(255,255,255,0.3); padding-bottom: 0.5rem;">${line}</div>`;
        } else {
            html += `<div style="margin: 0.25rem 0;">${line}</div>`;
        }
    });

    tooltip.innerHTML = html;
    tooltip.style.display = 'block';

    const rect = element.getBoundingClientRect();
    const chartRect = document.getElementById('account-chart').getBoundingClientRect();

    tooltip.style.left = (rect.left - chartRect.left + rect.width / 2 - 100) + 'px';
    tooltip.style.top = (rect.top - chartRect.top - tooltip.offsetHeight - 10) + 'px';
};

window.hideAccountTooltip = function() {
    const tooltip = document.getElementById('account-tooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
};

/**
 * Main display results function
 * @param {Object} data - Calculation results data
 */
function displayResults(data) {
    console.log('displayResults called', data);
    const resultsContent = document.getElementById('results-content');
    if (!resultsContent) {
        console.error('results-content element not found!');
        return;
    }
    let html = '';

    // ========== LEVEL 1: PRIMARY VIEW (ALWAYS VISIBLE) ==========

    // 1. YOUR INCOME (Weekly Take-Home Pay)
    html += renderIncomeSection(data);

    // 2. YOUR SPENDING (Total Weekly Expenses)
    if (data.expenseBreakdown && data.expenseBreakdown.length > 0) {
        html += renderSpendingSection(data);
    }

    // 3. YOUR CASH FLOW (Income - Expenses = Available)
    if (data.expenseBreakdown && data.expenseBreakdown.length > 0) {
        html += renderCashFlowSection(data);
    }

    // 4. EXPENSE ACCOUNT REQUIREMENT (Prominent calendar view)
    if (data.accountsPlan && data.expenseBreakdown && data.expenseBreakdown.length > 0) {
        html += renderExpenseAccountSection(data);
    }

    // ========== LEVEL 2: COLLAPSIBLE DETAILS ==========

    // Tax & Deduction Breakdown (Collapsible)
    html += renderTaxBreakdownSection(data);

    // Expense List (Collapsible)
    if (data.expenseBreakdown && data.expenseBreakdown.length > 0) {
        html += renderExpenseListSection(data);
    }

    // Account Transfer Plan (Collapsible)
    if (data.accountsPlan && data.expenseBreakdown && data.expenseBreakdown.length > 0) {
        html += renderAccountTransferSection(data);
    }

    // Savings Goal Progress (Collapsible)
    if (data.savingsAnalysis) {
        html += renderSavingsGoalSection(data);
    }

    // Cash Flow Model (Collapsible)
    if (data.cashFlowModel && data.cashFlowModel.weeklyModel) {
        html += renderCashFlowModelSection(data.cashFlowModel);
    }

    // Upcoming Expenses (Collapsible, if applicable)
    if (data.upcomingExpenses && data.upcomingExpenses.length > 0) {
        html += renderUpcomingExpensesSection(data);
    }

    resultsContent.innerHTML = html;
    console.log('Results HTML set, length:', html.length);

    // Ensure results section is visible (for wizard mode)
    const resultsSection = document.querySelector('.results-section');
    const isWizardMode = document.body.classList.contains('wizard-mode');
    console.log('Wizard mode active:', isWizardMode);

    if (resultsSection) {
        console.log('Results section found, current classes:', resultsSection.className);
        console.log('Adding show-results class to results section');
        resultsSection.classList.add('show-results');
        console.log('After adding, classes:', resultsSection.className);

        // Check computed style
        const computedStyle = window.getComputedStyle(resultsSection);
        console.log('Computed display:', computedStyle.display);

        // Force a reflow to ensure the class is applied
        void resultsSection.offsetHeight;
    } else {
        console.error('results-section not found!');
    }

    // Scroll to results after rendering
    setTimeout(() => {
        console.log('Scrolling to results...');
        if (resultsSection) {
            resultsSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            resultsContent.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
    }, 200);
}

/**
 * Render the Income section (Level 1 - Always Visible)
 */
function renderIncomeSection(data) {
    if (data.isVariableHours) {
        // Variable hours - show min/avg/max in compact row
        return `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1rem;">
                <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 1rem; border-radius: 10px; text-align: center;">
                    <div style="font-size: 0.75em; color: #1565c0; font-weight: 600; margin-bottom: 0.25rem; text-transform: uppercase;">Min Income</div>
                    <div style="font-size: 2em; font-weight: 800; color: #0d47a1; line-height: 1;">
                        $${data.deductionsMin.weeklyNet.toFixed(2)}
                    </div>
                    <div style="font-size: 0.7em; color: #555; margin-top: 0.25rem;">per week</div>
                </div>

                <div style="background: linear-gradient(135deg, #e8f5e9 0%, #a5d6a7 100%); padding: 1rem; border-radius: 10px; text-align: center; border: 2px solid #2e7d32;">
                    <div style="font-size: 0.75em; color: #2e7d32; font-weight: 600; margin-bottom: 0.25rem; text-transform: uppercase;">Avg Income</div>
                    <div style="font-size: 2em; font-weight: 800; color: #1b5e20; line-height: 1;">
                        $${data.weeklyNetIncome.toFixed(2)}
                    </div>
                    <div style="font-size: 0.7em; color: #555; margin-top: 0.25rem;">per week</div>
                </div>

                <div style="background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%); padding: 1rem; border-radius: 10px; text-align: center;">
                    <div style="font-size: 0.75em; color: #1565c0; font-weight: 600; margin-bottom: 0.25rem; text-transform: uppercase;">Max Income</div>
                    <div style="font-size: 2em; font-weight: 800; color: #0d47a1; line-height: 1;">
                        $${data.deductionsMax.weeklyNet.toFixed(2)}
                    </div>
                    <div style="font-size: 0.7em; color: #555; margin-top: 0.25rem;">per week</div>
                </div>
            </div>
        `;
    } else {
        // Fixed hours - single compact amount
        return `
            <div style="background: linear-gradient(135deg, #e8f5e9 0%, #a5d6a7 100%); padding: 1rem 1.5rem; border-radius: 10px; text-align: center; margin-bottom: 1rem;">
                <div style="font-size: 0.75em; color: #2e7d32; font-weight: 600; margin-bottom: 0.25rem; text-transform: uppercase;">Weekly Take-Home Pay</div>
                <div style="font-size: 2.5em; font-weight: 900; color: #1b5e20; line-height: 1;">
                    $${data.weeklyNetIncome.toFixed(2)}
                </div>
                <div style="font-size: 0.85em; color: #555; margin-top: 0.25rem;">
                    from $${data.weeklyGrossIncome.toFixed(2)} gross
                </div>
            </div>
        `;
    }
}

/**
 * Render the Spending section (Level 1 - Always Visible)
 */
function renderSpendingSection(data) {
    return `
        <div style="background: linear-gradient(135deg, #ffebee 0%, #ef9a9a 100%); padding: 1rem 1.5rem; border-radius: 10px; text-align: center; margin-bottom: 1rem;">
            <div style="font-size: 0.75em; color: #c62828; font-weight: 600; margin-bottom: 0.25rem; text-transform: uppercase;">Weekly Expenses</div>
            <div style="font-size: 2.5em; font-weight: 900; color: #b71c1c; line-height: 1;">
                $${data.weeklyExpenses.toFixed(2)}
            </div>
            <div style="font-size: 0.85em; color: #555; margin-top: 0.25rem;">
                ${data.expenseBreakdown.length} expense${data.expenseBreakdown.length !== 1 ? 's' : ''}
            </div>
        </div>
    `;
}

/**
 * Render the Cash Flow section (Level 1 - Always Visible)
 */
function renderCashFlowSection(data) {
    const isPositive = data.weeklyDisposable >= 0;

    if (data.isVariableHours) {
        const weeklyDisposableMin = data.deductionsMin.weeklyNet - data.weeklyExpenses;
        const weeklyDisposableMax = data.deductionsMax.weeklyNet - data.weeklyExpenses;

        return `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: ${weeklyDisposableMin >= 0 ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)'}; padding: 1rem; border-radius: 10px; text-align: center;">
                    <div style="font-size: 0.75em; color: ${weeklyDisposableMin >= 0 ? '#2e7d32' : '#c62828'}; font-weight: 600; margin-bottom: 0.25rem; text-transform: uppercase;">Min Available</div>
                    <div style="font-size: 2em; font-weight: 800; color: ${weeklyDisposableMin >= 0 ? '#1b5e20' : '#b71c1c'}; line-height: 1;">
                        $${weeklyDisposableMin.toFixed(2)}
                    </div>
                    <div style="font-size: 0.7em; color: #555; margin-top: 0.25rem;">per week</div>
                </div>

                <div style="background: ${isPositive ? 'linear-gradient(135deg, #66bb6a 0%, #43a047 100%)' : 'linear-gradient(135deg, #ef5350 0%, #e53935 100%)'}; padding: 1rem; border-radius: 10px; text-align: center; border: 2px solid ${isPositive ? '#2e7d32' : '#c62828'};">
                    <div style="font-size: 0.75em; color: white; font-weight: 600; margin-bottom: 0.25rem; text-transform: uppercase;">Avg Available</div>
                    <div style="font-size: 2em; font-weight: 800; color: white; line-height: 1;">
                        $${data.weeklyDisposable.toFixed(2)}
                    </div>
                    <div style="font-size: 0.7em; color: rgba(255,255,255,0.95); margin-top: 0.25rem;">per week</div>
                </div>

                <div style="background: ${weeklyDisposableMax >= 0 ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' : 'linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%)'}; padding: 1rem; border-radius: 10px; text-align: center;">
                    <div style="font-size: 0.75em; color: ${weeklyDisposableMax >= 0 ? '#2e7d32' : '#c62828'}; font-weight: 600; margin-bottom: 0.25rem; text-transform: uppercase;">Max Available</div>
                    <div style="font-size: 2em; font-weight: 800; color: ${weeklyDisposableMax >= 0 ? '#1b5e20' : '#b71c1c'}; line-height: 1;">
                        $${weeklyDisposableMax.toFixed(2)}
                    </div>
                    <div style="font-size: 0.7em; color: #555; margin-top: 0.25rem;">per week</div>
                </div>
            </div>
        `;
    } else {
        return `
            <div style="background: ${isPositive ? 'linear-gradient(135deg, #66bb6a 0%, #43a047 100%)' : 'linear-gradient(135deg, #ef5350 0%, #e53935 100%)'}; padding: 1rem 1.5rem; border-radius: 10px; text-align: center; margin-bottom: 1.5rem;">
                <div style="font-size: 0.75em; color: white; font-weight: 600; margin-bottom: 0.25rem; text-transform: uppercase;">Available Cash</div>
                <div style="font-size: 2.5em; font-weight: 900; color: white; line-height: 1;">
                    $${data.weeklyDisposable.toFixed(2)}
                </div>
                <div style="font-size: 0.85em; color: rgba(255,255,255,0.95); margin-top: 0.25rem;">
                    per week after expenses
                </div>
            </div>
        `;
    }
}

/**
 * Render the Expense Account Calendar (Level 1 - Prominent)
 */
function renderExpenseAccountSection(data) {
    const plan = data.accountsPlan;
    const expenseAccountName = Object.keys(plan.accountTimelines)[0];
    const expenseTimeline = plan.accountTimelines[expenseAccountName];

    if (!expenseTimeline) return '';

    const maxBalance = expenseTimeline.maxRequired;

    let html = `
        <div style="margin-bottom: 1.5rem; padding: 1.5rem; background: linear-gradient(135deg, #f5f7fa 0%, #e8eaf6 100%); border-radius: 10px;">
            <h3 style="margin: 0 0 0.5rem 0; color: var(--primary-color); font-size: 1.2em; font-weight: 700;">${expenseAccountName} - Weekly Balance Required</h3>

            <div id="account-chart" style="position: relative; background: white; padding: 1rem; border-radius: 8px;">
                <div style="display: grid; grid-template-columns: repeat(16, 1fr); gap: 4px; align-items: flex-end; height: 150px; border-bottom: 2px solid #ccc; padding-bottom: 8px;">
    `;

    // Create interactive bar chart with dates
    expenseTimeline.timeline.forEach((week, index) => {
        const heightPercent = maxBalance > 0 ? (week.requiredBalance / maxBalance) * 100 : 0;
        const color = week.expensesDue.length > 0 ? '#e91e63' : '#5c6bc0';

        // Build tooltip content
        let tooltipText = `${week.displayDate}\\n`;
        tooltipText += `Required: $${week.requiredBalance.toFixed(2)}\\n`;
        tooltipText += `Current: $${week.currentBalance.toFixed(2)}`;
        if (week.expensesDue.length > 0) {
            tooltipText += `\\n\\nExpenses next week:`;
            week.expensesDue.forEach(exp => {
                tooltipText += `\\n- ${exp.description}: $${exp.amount.toFixed(2)}`;
            });
        }

        html += `
            <div style="position: relative; height: 100%; display: flex; flex-direction: column; justify-content: flex-end; cursor: pointer;"
                 onmouseover="showAccountTooltip(this, '${tooltipText.replace(/'/g, "\\'")}', ${week.requiredBalance.toFixed(2)}, ${week.currentBalance.toFixed(2)}, ${week.expensesDue.length})"
                 onmouseout="hideAccountTooltip()">
                <div style="background: ${color}; height: ${heightPercent}%; border-radius: 4px 4px 0 0; min-height: ${week.requiredBalance > 0 ? '3px' : '0'}; transition: all 0.3s; box-shadow: 0 2px 4px rgba(0,0,0,0.1);"></div>
            </div>
        `;
    });

    html += `
                </div>
                <div id="account-tooltip" style="display: none; position: absolute; background: rgba(0,0,0,0.92); color: white; padding: 0.75rem; border-radius: 6px; pointer-events: none; z-index: 1000; min-width: 180px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); font-size: 0.85em;"></div>
            </div>

            <!-- Week labels with actual dates -->
            <div style="display: grid; grid-template-columns: repeat(16, 1fr); gap: 4px; margin-top: 6px; font-size: 0.7em; text-align: center; color: #666;">
    `;

    // Add date labels (show every other week to avoid crowding)
    expenseTimeline.timeline.forEach((week, index) => {
        if (index % 2 === 0) {
            html += `<div style="grid-column: span 1;">${week.displayDate}</div>`;
        } else {
            html += `<div></div>`;
        }
    });

    html += `
            </div>

            <!-- Legend -->
            <div style="margin-top: 1rem; padding: 0.75rem; background: #f9fafb; border-radius: 6px;">
                <div style="display: flex; gap: 1.5rem; align-items: center; justify-content: center; flex-wrap: wrap; font-size: 0.85em;">
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 16px; height: 16px; background: #5c6bc0; border-radius: 2px;"></div>
                        <span>Regular</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.5rem;">
                        <div style="width: 16px; height: 16px; background: #e91e63; border-radius: 2px;"></div>
                        <span>Expenses due</span>
                    </div>
                </div>
            </div>
        </div>
    `;

    return html;
}

/**
 * Render Tax & Deduction Breakdown (Level 2 - Collapsible)
 */
function renderTaxBreakdownSection(data) {
    let html = `
        <details style="margin-bottom: 1rem;">
            <summary style="cursor: pointer; font-weight: 600; padding: 0.75rem 1rem; background: #f5f5f5; border-radius: 8px; font-size: 0.95em;">
                Tax & Deduction Breakdown
            </summary>
            <div style="padding: 1rem; background: #fafafa; border-radius: 0 0 8px 8px; margin-top: -8px;">
    `;

    if (data.isVariableHours) {
        // Show all three scenarios
        html += `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem;">
                ${renderDeductionDetails('Minimum', data.weeklyGrossIncomeMin, data.deductionsMin)}
                ${renderDeductionDetails('Average', data.weeklyGrossIncome, {
                    weeklyTax: data.weeklyTax,
                    weeklyACC: data.weeklyACC,
                    weeklyKiwisaver: data.weeklyKiwisaver,
                    weeklyEmployerKiwisaver: data.weeklyEmployerKiwisaver,
                    weeklyStudentLoan: data.weeklyStudentLoan,
                    weeklyIETC: data.weeklyIETC,
                    weeklyNet: data.weeklyNetIncome
                })}
                ${renderDeductionDetails('Maximum', data.weeklyGrossIncomeMax, data.deductionsMax)}
            </div>
        `;
    } else {
        html += renderDeductionDetails('Weekly', data.weeklyGrossIncome, {
            weeklyTax: data.weeklyTax,
            weeklyACC: data.weeklyACC,
            weeklyKiwisaver: data.weeklyKiwisaver,
            weeklyEmployerKiwisaver: data.weeklyEmployerKiwisaver,
            weeklyStudentLoan: data.weeklyStudentLoan,
            weeklyIETC: data.weeklyIETC,
            weeklyNet: data.weeklyNetIncome
        });
    }

    html += `
            </div>
        </details>
    `;

    return html;
}

/**
 * Helper function to render deduction details
 */
function renderDeductionDetails(label, gross, deductions) {
    let html = `
        <div style="background: white; padding: 1rem; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.05);">
            <h4 style="margin: 0 0 0.5rem 0; color: #333; font-size: 0.95em;">${label}</h4>
            <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px solid #eee; font-size: 0.9em;">
                <span>Gross Income</span>
                <span style="font-weight: 600;">$${gross.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px solid #eee; font-size: 0.9em;">
                <span>PAYE Tax</span>
                <span style="color: #c62828;">-$${deductions.weeklyTax.toFixed(2)}</span>
            </div>
    `;

    if (deductions.weeklyIETC > 0) {
        html += `
            <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px solid #eee; font-size: 0.85em;">
                <span>IETC Credit</span>
                <span style="color: #2e7d32;">+$${deductions.weeklyIETC.toFixed(2)}</span>
            </div>
        `;
    }

    html += `
            <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px solid #eee; font-size: 0.9em;">
                <span>ACC Levy</span>
                <span style="color: #c62828;">-$${deductions.weeklyACC.toFixed(2)}</span>
            </div>
    `;

    if (deductions.weeklyKiwisaver > 0) {
        html += `
            <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px solid #eee; font-size: 0.9em;">
                <span>KiwiSaver</span>
                <span style="color: #c62828;">-$${deductions.weeklyKiwisaver.toFixed(2)}</span>
            </div>
        `;
    }

    if (deductions.weeklyStudentLoan > 0) {
        html += `
            <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; border-bottom: 1px solid #eee; font-size: 0.9em;">
                <span>Student Loan</span>
                <span style="color: #c62828;">-$${deductions.weeklyStudentLoan.toFixed(2)}</span>
            </div>
        `;
    }

    html += `
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; margin-top: 0.25rem; border-top: 2px solid #333; font-size: 0.9em;">
                <span style="font-weight: 700;">Take-Home</span>
                <span style="font-weight: 700; color: #2e7d32;">$${deductions.weeklyNet.toFixed(2)}</span>
            </div>
    `;

    if (deductions.weeklyEmployerKiwisaver > 0) {
        html += `
            <div style="display: flex; justify-content: space-between; padding: 0.35rem 0; margin-top: 0.25rem; border-top: 1px dashed #ccc; font-size: 0.85em; font-style: italic;">
                <span>Employer KiwiSaver</span>
                <span style="color: #2e7d32;">+$${deductions.weeklyEmployerKiwisaver.toFixed(2)}</span>
            </div>
        `;
    }

    html += `</div>`;
    return html;
}

/**
 * Render Expense List (Level 2 - Collapsible)
 */
function renderExpenseListSection(data) {
    let html = `
        <details style="margin-bottom: 1rem;">
            <summary style="cursor: pointer; font-weight: 600; padding: 0.75rem 1rem; background: #f5f5f5; border-radius: 8px; font-size: 0.95em;">
                Expense List
            </summary>
            <div style="padding: 1rem; background: #fafafa; border-radius: 0 0 8px 8px; margin-top: -8px;">
                <div style="background: white; padding: 1rem; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.05);">
    `;

    data.expenseBreakdown.forEach(expense => {
        html += `
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid #eee; font-size: 0.9em;">
                <span style="font-weight: 500;">${expense.description}</span>
                <span style="color: #c62828; font-weight: 600;">$${expense.amount.toFixed(2)}</span>
            </div>
        `;
    });

    html += `
                    <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; margin-top: 0.25rem; border-top: 2px solid #333; font-size: 0.9em;">
                        <span style="font-weight: 700;">Total Weekly</span>
                        <span style="font-weight: 700; color: #c62828;">$${data.weeklyExpenses.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </details>
    `;

    return html;
}

/**
 * Render Account Transfer Plan (Level 2 - Collapsible)
 */
function renderAccountTransferSection(data) {
    const plan = data.accountsPlan;

    let html = `
        <details style="margin-bottom: 1rem;">
            <summary style="cursor: pointer; font-weight: 600; padding: 0.75rem 1rem; background: #f5f5f5; border-radius: 8px; font-size: 0.95em;">
                Account Transfer Plan
            </summary>
            <div style="padding: 1rem; background: #fafafa; border-radius: 0 0 8px 8px; margin-top: -8px;">

                <!-- Weekly transfer amounts -->
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 0.75rem; margin-bottom: 1rem;">
    `;

    Object.entries(plan.accountTimelines).forEach(([accountName, accountData]) => {
        html += `
            <div style="background: white; padding: 0.75rem; border-radius: 6px; text-align: center; box-shadow: 0 1px 4px rgba(0,0,0,0.05);">
                <div style="font-size: 0.75em; color: #666; font-weight: 600; margin-bottom: 0.25rem; text-transform: uppercase;">${accountName}</div>
                <div style="font-size: 1.5em; font-weight: 800; color: #3f51b5; margin: 0.25rem 0;">$${accountData.weeklyTransfer.toFixed(2)}</div>
                <div style="font-size: 0.7em; color: #666;">per week</div>
                ${accountData.startingBalance > 0 ? `<div style="font-size: 0.7em; color: #888; margin-top: 0.25rem;">Start: $${accountData.startingBalance.toFixed(2)}</div>` : ''}
            </div>
        `;
    });

    html += `
                </div>

                <!-- Detailed timeline table -->
                ${renderAccountTimelineTable(plan)}

            </div>
        </details>
    `;

    return html;
}

/**
 * Render Account Timeline Table
 */
function renderAccountTimelineTable(plan) {
    const expenseAccountName = Object.keys(plan.accountTimelines)[0];
    const expenseTimeline = plan.accountTimelines[expenseAccountName];

    if (!expenseTimeline) return '';

    let html = `
        <div style="background: white; padding: 1rem; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.05);">
            <h4 style="margin: 0 0 0.75rem 0; color: #333; font-size: 0.95em;">Weekly Schedule - ${expenseAccountName}</h4>
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.85em;">
                    <thead>
                        <tr style="background: #f5f5f5; border-bottom: 2px solid #3f51b5;">
                            <th style="padding: 0.5rem; text-align: left; font-weight: 600;">Week</th>
                            <th style="padding: 0.5rem; text-align: left; font-weight: 600;">Date</th>
                            <th style="padding: 0.5rem; text-align: right; font-weight: 600;">Transfer In</th>
                            <th style="padding: 0.5rem; text-align: right; font-weight: 600;">Expenses Out</th>
                            <th style="padding: 0.5rem; text-align: right; font-weight: 600;">Balance</th>
                            <th style="padding: 0.5rem; text-align: left; font-weight: 600;">Notes</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    expenseTimeline.timeline.forEach((week, index) => {
        const transferIn = expenseTimeline.weeklyTransfer;
        const expensesOut = week.weekExpenses;
        const balance = week.currentBalance;
        const isExpenseWeek = week.expensesDue.length > 0;
        const rowStyle = isExpenseWeek ? 'background: #fff8f8;' : '';

        let notes = '';
        if (week.expensesDue.length > 0) {
            notes = week.expensesDue.map(e => e.description).join(', ') + ' (next week)';
        }

        html += `
            <tr style="${rowStyle} border-bottom: 1px solid #eee;">
                <td style="padding: 0.5rem;">${week.week + 1}</td>
                <td style="padding: 0.5rem; font-weight: 500;">${week.displayDate}</td>
                <td style="padding: 0.5rem; text-align: right; color: #2e7d32; font-weight: 600;">+$${transferIn.toFixed(2)}</td>
                <td style="padding: 0.5rem; text-align: right; color: ${expensesOut > 0 ? '#c62828' : '#666'}; font-weight: ${expensesOut > 0 ? '600' : 'normal'};">
                    ${expensesOut > 0 ? '-$' + expensesOut.toFixed(2) : '$0.00'}
                </td>
                <td style="padding: 0.5rem; text-align: right; font-weight: 700; color: ${balance < 0 ? '#c62828' : '#333'};">
                    $${balance.toFixed(2)}
                </td>
                <td style="padding: 0.5rem; font-size: 0.8em; color: #666;">
                    ${notes || '-'}
                </td>
            </tr>
        `;
    });

    html += `
                    </tbody>
                </table>
            </div>
        </div>
    `;

    return html;
}

/**
 * Render Savings Goal Progress (Level 2 - Collapsible)
 */
function renderSavingsGoalSection(data) {
    const analysis = data.savingsAnalysis;

    let html = `
        <details style="margin-bottom: 1rem;">
            <summary style="cursor: pointer; font-weight: 600; padding: 0.75rem 1rem; background: ${analysis.achievable ? '#e8f5e9' : '#fff3cd'}; border-radius: 8px; font-size: 0.95em;">
                Savings Goal Progress
            </summary>
            <div style="padding: 1rem; background: #fafafa; border-radius: 0 0 8px 8px; margin-top: -8px;">
                <div style="background: white; padding: 1rem; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.05);">
    `;

    if (analysis.achievable) {
        html += `
            <div style="color: #2e7d32; font-weight: 600; margin-bottom: 0.75rem; font-size: 0.95em;">Goal is achievable</div>
        `;

        if (analysis.futureValue) {
            // Investment projection
            html += `
                <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #eee; font-size: 0.9em;">
                    <span>Weeks to goal</span>
                    <span style="font-weight: 600;">${analysis.weeks}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #eee; font-size: 0.9em;">
                    <span>Weekly savings</span>
                    <span style="font-weight: 600;">$${data.weeklyDisposable.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #eee; font-size: 0.9em;">
                    <span>Interest earned</span>
                    <span style="font-weight: 600; color: #2e7d32;">$${analysis.interestEarned.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; margin-top: 0.25rem; border-top: 2px solid #333; font-size: 0.9em;">
                    <span style="font-weight: 700;">Final amount</span>
                    <span style="font-weight: 700; color: #2e7d32;">$${analysis.futureValue.toFixed(2)}</span>
                </div>
            `;
        } else {
            // Simple savings
            html += `
                <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #eee; font-size: 0.9em;">
                    <span>Weeks to goal</span>
                    <span style="font-weight: 600;">${analysis.weeks}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #eee; font-size: 0.9em;">
                    <span>Weekly savings</span>
                    <span style="font-weight: 600;">$${data.weeklyDisposable.toFixed(2)}</span>
                </div>
                <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; margin-top: 0.25rem; border-top: 2px solid #333; font-size: 0.9em;">
                    <span style="font-weight: 700;">Surplus</span>
                    <span style="font-weight: 700; color: #2e7d32;">$${analysis.surplus.toFixed(2)}</span>
                </div>
            `;
        }
    } else {
        html += `
            <div style="color: #c62828; font-weight: 600; margin-bottom: 0.75rem; font-size: 0.95em;">Goal not achievable</div>
            <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #eee; font-size: 0.9em;">
                <span>Required weekly</span>
                <span style="font-weight: 600;">$${analysis.requiredWeekly.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.4rem 0; border-bottom: 1px solid #eee; font-size: 0.9em;">
                <span>Current disposable</span>
                <span style="font-weight: 600;">$${data.weeklyDisposable.toFixed(2)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; margin-top: 0.25rem; border-top: 2px solid #333; font-size: 0.9em;">
                <span style="font-weight: 700;">Shortfall</span>
                <span style="font-weight: 700; color: #c62828;">$${(analysis.requiredWeekly - data.weeklyDisposable).toFixed(2)}</span>
            </div>
        `;
    }

    html += `
                </div>
            </div>
        </details>
    `;

    return html;
}

/**
 * Render Upcoming Expenses (Level 2 - Collapsible)
 */
function renderUpcomingExpensesSection(data) {
    let html = `
        <details style="margin-bottom: 1rem;">
            <summary style="cursor: pointer; font-weight: 600; padding: 0.75rem 1rem; background: #fff3cd; border-radius: 8px; font-size: 0.95em;">
                Upcoming Expenses (Next 60 Days)
            </summary>
            <div style="padding: 1rem; background: #fafafa; border-radius: 0 0 8px 8px; margin-top: -8px;">
                <div style="background: white; padding: 1rem; border-radius: 6px; box-shadow: 0 1px 4px rgba(0,0,0,0.05);">
    `;

    data.upcomingExpenses.sort((a, b) => a.daysUntil - b.daysUntil).forEach(expense => {
        const urgencyText = expense.daysUntil === 0 ? 'Due today' :
                           expense.daysUntil === 1 ? 'Due tomorrow' :
                           `Due in ${expense.daysUntil} days`;
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid #eee; font-size: 0.9em;">
                <div>
                    <div style="font-weight: 600;">${expense.description}</div>
                    <div style="font-size: 0.85em; color: #666; margin-top: 0.15rem;">
                        ${urgencyText} (${new Date(expense.dueDate).toLocaleDateString('en-NZ')})
                    </div>
                </div>
                <span style="font-weight: 700; color: #c62828;">$${expense.amount.toFixed(2)}</span>
            </div>
        `;
    });

    const totalUpcoming = data.upcomingExpenses.reduce((sum, exp) => sum + exp.amount, 0);
    html += `
                    <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; margin-top: 0.25rem; border-top: 2px solid #333; font-size: 0.9em;">
                        <span style="font-weight: 700;">Total Due</span>
                        <span style="font-weight: 700; color: #c62828;">$${totalUpcoming.toFixed(2)}</span>
                    </div>
                </div>
            </div>
        </details>
    `;

    return html;
}

/**
 * Render Cash Flow Model section - week-by-week projection
 */
function renderCashFlowModelSection(cashFlowModel) {
    const { weeklyModel, accounts } = cashFlowModel;

    // Get all account names (excluding spending account for transfer columns)
    const accountNames = accounts
        .filter(a => !a.isSpendingAccount)
        .map(a => a.name);

    const spendingAccount = accounts.find(a => a.isSpendingAccount);

    let html = `
        <details class="collapsible-section" style="margin-bottom: 1rem; border-radius: 10px; overflow: hidden; border: 1px solid #e0e0e0;">
            <summary style="background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%); padding: 1rem; cursor: pointer; font-weight: 700; font-size: 1.05em; color: #4a148c; display: flex; justify-content: space-between; align-items: center;">
                <span>📊 Cash Flow Model (${weeklyModel.length} weeks)</span>
                <span style="font-size: 0.9em; font-weight: 600; color: #6a1b9a;">Click to expand</span>
            </summary>
            <div style="padding: 1rem; background: white;">
                <div style="margin-bottom: 1rem;">
                    <h4 style="margin: 0 0 0.5rem 0; color: #4a148c;">Week-by-Week Projection</h4>
                    <p style="margin: 0; font-size: 0.9em; color: #666;">Shows how your money flows between accounts based on income, expenses, and target balances.</p>
                </div>

                <div style="overflow-x: auto;">
                    <table style="width: 100%; border-collapse: collapse; font-size: 0.85em; min-width: 600px;">
                        <thead>
                            <tr style="background: #f5f5f5; border-bottom: 2px solid #333;">
                                <th style="padding: 0.5rem; text-align: left; font-weight: 700;">Week</th>
                                <th style="padding: 0.5rem; text-align: left; font-weight: 700;">Date</th>
                                <th style="padding: 0.5rem; text-align: right; font-weight: 700;">Pay</th>
                                <th style="padding: 0.5rem; text-align: right; font-weight: 700;">Expenses</th>
                                <th style="padding: 0.5rem; text-align: right; font-weight: 700;">${spendingAccount ? spendingAccount.name : 'Spending'}</th>
                                ${accountNames.map(name => `<th style="padding: 0.5rem; text-align: right; font-weight: 700;">${name}</th>`).join('')}
                                <th style="padding: 0.5rem; text-align: center; font-weight: 700;">Status</th>
                            </tr>
                        </thead>
                        <tbody>
    `;

    weeklyModel.forEach((week, index) => {
        const rowBg = index % 2 === 0 ? 'white' : '#fafafa';
        const statusColor = week.status === 'surplus' ? '#4caf50' :
                           week.status === 'tight' ? '#ff9800' : '#f44336';
        const statusText = week.status === 'surplus' ? '✓' :
                          week.status === 'tight' ? '⚠' : '✗';

        html += `
            <tr style="background: ${rowBg}; border-bottom: 1px solid #eee;">
                <td style="padding: 0.5rem; font-weight: 600;">${week.weekNumber}</td>
                <td style="padding: 0.5rem;">${week.displayDate}</td>
                <td style="padding: 0.5rem; text-align: right; color: ${week.payReceived > 0 ? '#2e7d32' : '#666'};">
                    ${week.payReceived > 0 ? `$${week.payReceived.toFixed(2)}` : '-'}
                </td>
                <td style="padding: 0.5rem; text-align: right; color: ${week.expensesPaid > 0 ? '#c62828' : '#666'};">
                    ${week.expensesPaid > 0 ? `$${week.expensesPaid.toFixed(2)}` : '-'}
                </td>
                <td style="padding: 0.5rem; text-align: right; font-weight: 600;">
                    $${week.balances[spendingAccount ? spendingAccount.name : 'Spending Account'].toFixed(2)}
                </td>
        `;

        accountNames.forEach(accountName => {
            const transfer = week.transfers[accountName] || 0;
            const balance = week.balances[accountName] || 0;
            html += `
                <td style="padding: 0.5rem; text-align: right;">
                    <div style="font-weight: 600;">$${balance.toFixed(2)}</div>
                    ${transfer > 0 ? `<div style="font-size: 0.75em; color: #1976d2;">+$${transfer.toFixed(2)}</div>` : ''}
                </td>
            `;
        });

        html += `
                <td style="padding: 0.5rem; text-align: center;">
                    <span style="font-size: 1.2em;" title="${week.status}">${statusText}</span>
                </td>
            </tr>
        `;
    });

    html += `
                        </tbody>
                    </table>
                </div>

                <div style="margin-top: 1rem; padding: 1rem; background: #f5f5f5; border-radius: 5px;">
                    <h4 style="margin: 0 0 0.5rem 0; font-size: 0.95em;">Account Summary</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 0.75rem;">
    `;

    accounts.forEach(account => {
        const progress = account.targetBalance ?
            Math.min(100, (account.endBalance / account.targetBalance) * 100) : 100;
        const change = account.endBalance - account.startBalance;
        const changeColor = change >= 0 ? '#2e7d32' : '#c62828';

        html += `
            <div style="padding: 0.5rem; background: white; border-radius: 5px; border: 1px solid #ddd;">
                <div style="font-weight: 600; margin-bottom: 0.25rem;">${account.name}</div>
                <div style="font-size: 0.85em; color: #666;">
                    Start: $${account.startBalance.toFixed(2)} → End: $${account.endBalance.toFixed(2)}
                </div>
                <div style="font-size: 0.85em; font-weight: 600; color: ${changeColor}; margin-top: 0.25rem;">
                    ${change >= 0 ? '+' : ''}$${change.toFixed(2)}
                </div>
                ${account.targetBalance ? `
                    <div style="margin-top: 0.5rem;">
                        <div style="font-size: 0.75em; color: #666; margin-bottom: 0.15rem;">
                            Target: $${account.targetBalance.toFixed(2)} (${progress.toFixed(0)}%)
                        </div>
                        <div style="width: 100%; height: 4px; background: #e0e0e0; border-radius: 2px; overflow: hidden;">
                            <div style="width: ${progress}%; height: 100%; background: linear-gradient(90deg, #4caf50, #8bc34a); transition: width 0.3s;"></div>
                        </div>
                    </div>
                ` : ''}
            </div>
        `;
    });

    html += `
                    </div>
                    <div style="margin-top: 0.75rem; padding: 0.5rem; background: #e3f2fd; border-radius: 5px; font-size: 0.85em;">
                        <strong>Status Legend:</strong> ✓ = Surplus | ⚠ = Tight (below $300) | ✗ = Deficit (below $100)
                    </div>
                </div>
            </div>
        </details>
    `;

    return html;
}

// Export for use in calculator.js
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { displayResults };
} else {
    window.displayResults = displayResults;
}
