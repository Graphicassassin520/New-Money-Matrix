// Matrix background animation
const canvas = document.getElementById('matrix');
const ctx = canvas.getContext('2d');
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;
const letters = Array(256).join(1).split('');
const draw = () => {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#85bb65'; // Money green
    letters.map((y_pos, index) => {
        const text = String.fromCharCode(3e4 + Math.random() * 33);
        const x_pos = index * 10;
        ctx.fillText(text, x_pos, y_pos);
        letters[index] = y_pos > canvas.height && Math.random() > 0.99 ? 0 : y_pos + 10;
    });
};
setInterval(draw, 33);
window.addEventListener('resize', () => {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
});

// Update current date and time
function updateDateTime() {
    const now = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' };
    document.getElementById('currentDateTime').textContent = now.toLocaleDateString('en-US', options);
}
setInterval(updateDateTime, 1000);
updateDateTime(); // Initial call

let currentMonthYear = { year: new Date().getFullYear(), month: new Date().getMonth() + 1 };

class BudgetApp {
    constructor() {
        this.achievements = [
            {
                name: "Savings Master",
                description: "Save more than 20% of your income",
                condition: () => this.remaining > 0.2 * this.paycheck
            },
            {
                name: "Bill Slayer",
                description: "Have no overdue bills",
                condition: () => Object.values(this.bills).every(bill => new Date(bill.dueDate) >= new Date())
            }
        ];
        this.loadMonthData();
    }

    getStorageKey() {
        const monthStr = currentMonthYear.month.toString().padStart(2, '0');
        return `budget_${currentMonthYear.year}_${monthStr}`;
    }

    loadMonthData() {
        const key = this.getStorageKey();
        const data = JSON.parse(localStorage.getItem(key)) || {};
        this.paycheck = data.paycheck || 0;
        this.bills = data.bills || {};
        this.savingsGoal = data.savingsGoal || 0;
        this.bestSavings = data.bestSavings || 0;
        this.unlockedAchievements = data.unlockedAchievements || [];
        this.updateBudget();
        this.updateAchievements();
        this.updateRecords();
    }

    saveMonthData() {
        const key = this.getStorageKey();
        const data = {
            paycheck: this.paycheck,
            bills: this.bills,
            savingsGoal: this.savingsGoal,
            bestSavings: this.bestSavings,
            unlockedAchievements: this.unlockedAchievements
        };
        localStorage.setItem(key, JSON.stringify(data));
    }

    setIncome(amount) {
        if (isNaN(amount) || amount < 0) {
            alert("Please enter a valid positive number for income.");
            return;
        }
        this.paycheck = amount;
        this.saveMonthData();
        this.updateBudget();
    }

    setSavingsGoal(amount) {
        if (isNaN(amount) || amount < 0) {
            alert("Please enter a valid positive number for savings goal.");
            return;
        }
        this.savingsGoal = amount;
        this.saveMonthData();
        this.updateBudget();
    }

    addBill(name, amount, dueDate, category) {
        if (!name || isNaN(amount) || amount <= 0 || !dueDate) {
            alert("Please enter valid bill details.");
            return;
        }
        this.bills[name] = { amount, dueDate, category };
        this.saveMonthData();
        this.updateBudget();
    }

    editBill(oldName, newName, amount, dueDate, category) {
        if (!newName || isNaN(amount) || amount <= 0 || !dueDate) {
            alert("Invalid bill details.");
            return;
        }
        if (newName !== oldName && this.bills[newName]) {
            alert("A bill with that name already exists.");
            return;
        }
        if (oldName !== newName) delete this.bills[oldName];
        this.bills[newName] = { amount, dueDate, category };
        this.saveMonthData();
        this.updateBudget();
    }

    deleteBill(name) {
        delete this.bills[name];
        this.saveMonthData();
        this.updateBudget();
    }

    updateBudget() {
        const totalBills = Object.values(this.bills).reduce((sum, bill) => sum + bill.amount, 0);
        this.remaining = this.paycheck - totalBills;

        let billListHtml = '';
        if (Object.keys(this.bills).length === 0) {
            billListHtml = '<p>No bills added yet.</p>';
        } else {
            for (let [name, info] of Object.entries(this.bills)) {
                const escapedName = name.replace(/'/g, "\\'");
                billListHtml += `
                    <div class="bill-item">
                        <span>${name} (${info.category}): $${info.amount.toFixed(2)} (Due: ${new Date(info.dueDate).toLocaleDateString()})</span>
                        <button onclick="editBillPrompt('${escapedName}')">Edit</button>
                        <button onclick="deleteBill('${escapedName}')">Delete</button>
                    </div>
                `;
            }
        }

        const outputHtml = `
            <p>Budget Overview</p>
            <p>====================</p>
            <p>Monthly Income: $${this.paycheck.toFixed(2)}</p>
            <p>Bills:</p>
            <div class="bill-list">${billListHtml}</div>
            <p>Total Bills: $${totalBills.toFixed(2)}</p>
            <p>Remaining Funds: $${this.remaining.toFixed(2)}</p>
            <p>Savings Goal Progress: ${this.savingsGoal ? ((this.remaining / this.savingsGoal) * 100).toFixed(0) : 0}% of $${this.savingsGoal ? this.savingsGoal.toFixed(2) : '0.00'}</p>
        `;

        document.getElementById('budgetOutput').innerHTML = outputHtml;

        // Update chart
        if (window.budgetChart) {
            window.budgetChart.data.datasets[0].data = [this.paycheck, totalBills, this.remaining];
            window.budgetChart.update();
        }

        // Check achievements
        this.achievements.forEach(ach => {
            if (ach.condition() && !this.unlockedAchievements.includes(ach.name)) {
                this.unlockedAchievements.push(ach.name);
                this.saveMonthData();
                alert(`Achievement Unlocked: ${ach.name}`);
                confetti();
            }
        });

        // Update personal records
        if (this.remaining > this.bestSavings) {
            this.bestSavings = this.remaining;
            this.saveMonthData();
        }
    }

    updateAchievements() {
        const achievementList = document.getElementById('achievementList');
        achievementList.innerHTML = '';
        this.achievements.forEach(ach => {
            const isUnlocked = this.unlockedAchievements.includes(ach.name);
            const achievementDiv = document.createElement('div');
            achievementDiv.className = 'achievement ' + (isUnlocked ? 'unlocked' : 'locked');
            achievementDiv.textContent = `${ach.name}: ${ach.description}`;
            achievementList.appendChild(achievementDiv);
        });
    }

    updateRecords() {
        const recordsDisplay = document.getElementById('recordsDisplay');
        recordsDisplay.textContent = `Best Savings: $${this.bestSavings.toFixed(2)}`;
    }
}

const app = new BudgetApp();

function setIncome() {
    const amount = parseFloat(document.getElementById('incomeAmount').value);
    app.setIncome(amount);
    document.getElementById('incomeAmount').value = '';
}

function setSavingsGoal() {
    const amount = parseFloat(document.getElementById('savingsGoal').value);
    app.setSavingsGoal(amount);
    document.getElementById('savingsGoal').value = '';
}

function addBill() {
    const name = document.getElementById('billName').value;
    const amount = parseFloat(document.getElementById('billAmount').value);
    const dueDate = document.getElementById('billDate').value;
    const category = document.getElementById('billCategory').value;
    app.addBill(name, amount, dueDate, category);
    document.getElementById('billName').value = '';
    document.getElementById('billAmount').value = '';
    document.getElementById('billDate').value = '';
}

function editBillPrompt(name) {
    const bill = app.bills[name];
    if (!bill) return;

    const newName = prompt("Enter new bill name:", name);
    if (!newName) return;

    const newAmount = prompt("Enter new amount:", bill.amount);
    if (!newAmount) return;
    const amountNum = parseFloat(newAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
        alert("Invalid amount");
        return;
    }

    const newDate = prompt("Enter new due date (YYYY-MM-DD):", bill.dueDate);
    if (!newDate || !/^\d{4}-\d{2}-\d{2}$/.test(newDate)) {
        alert("Invalid date format. Use YYYY-MM-DD");
        return;
    }

    const newCategory = prompt("Enter new category:", bill.category);
    if (!newCategory) return;

    app.editBill(name, newName, amountNum, newDate, newCategory);
}

function deleteBill(name) {
    if (confirm(`Are you sure you want to delete the bill "${name}"?`)) {
        app.deleteBill(name);
    }
}

function prevMonth() {
    if (currentMonthYear.month === 1) {
        currentMonthYear.month = 12;
        currentMonthYear.year -= 1;
    } else {
        currentMonthYear.month -= 1;
    }
    updateMonthDisplay();
    app.loadMonthData();
}

function nextMonth() {
    if (currentMonthYear.month === 12) {
        currentMonthYear.month = 1;
        currentMonthYear.year += 1;
    } else {
        currentMonthYear.month += 1;
    }
    updateMonthDisplay();
    app.loadMonthData();
}

function updateMonthDisplay() {
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    document.getElementById('currentMonth').textContent = `${monthNames[currentMonthYear.month - 1]} ${currentMonthYear.year}`;
}

// Initialize chart
const chartCtx = document.getElementById('budgetChart').getContext('2d');
window.budgetChart = new Chart(chartCtx, {
    type: 'bar',
    data: {
        labels: ['Income', 'Bills', 'Remaining'],
        datasets: [{
            label: 'Budget',
            data: [0, 0, 0],
            backgroundColor: ['#85bb65', '#ff3366', '#33ff66'],
            borderColor: ['#85bb65', '#ff3366', '#33ff66'],
            borderWidth: 1
        }]
    },
    options: {
        scales: {
            y: {
                beginAtZero: true
            }
        }
    }
});

// Initialize month display
updateMonthDisplay();
