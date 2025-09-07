const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                   'July', 'August', 'September', 'October', 'November', 'December'];
const hours = Array.from({length: 24}, (_, i) => i);

let currentDate = new Date();
let schedule = {};
let currentWeekDates = [];

// Storage functions
function saveSchedule() {
    try {
        localStorage.setItem('trainingSchedule', JSON.stringify(schedule));
        localStorage.setItem('currentDate', currentDate.toISOString());
    } catch (error) {
        console.error('Failed to save schedule:', error);
    }
}

function loadSchedule() {
    try {
        const savedSchedule = localStorage.getItem('trainingSchedule');
        const savedDate = localStorage.getItem('currentDate');
        
        if (savedSchedule) {
            schedule = JSON.parse(savedSchedule);
        }
        
        if (savedDate) {
            currentDate = new Date(savedDate);
        }
    } catch (error) {
        console.error('Failed to load schedule:', error);
        // Reset to defaults if loading fails
        schedule = {};
        currentDate = new Date();
    }
}

// Get week dates starting from Monday
function getWeekDates(date) {
    const week = [];
    const startOfWeek = new Date(date);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    startOfWeek.setDate(diff);
    
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(startOfWeek);
        currentDay.setDate(startOfWeek.getDate() + i);
        week.push(currentDay);
    }
    return week;
}

// Format date as YYYY-MM-DD for use as schedule key
function formatDateKey(date) {
    return date.toISOString().split('T')[0];
}

// Initialize schedule for current week
function initSchedule() {
    loadSchedule(); // Load saved data first
    currentWeekDates = getWeekDates(currentDate);
    updateMonthDisplay();
    updateWorkDayOptions();
    
    currentWeekDates.forEach(date => {
        const dateKey = formatDateKey(date);
        if (!schedule[dateKey]) {
            schedule[dateKey] = {};
            hours.forEach(hour => {
                schedule[dateKey][hour] = '';
            });
            
            // Add default sleep hours (11 PM - 7 AM)
            for (let h = 23; h < 24; h++) schedule[dateKey][h] = 'sleep';
            for (let h = 0; h < 7; h++) schedule[dateKey][h] = 'sleep';
        }
    });
    
    renderSchedule();
}

// Update month and week displays
function updateMonthDisplay() {
    const monthYear = `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
    document.getElementById('currentMonth').textContent = monthYear;
    
    // Update week display
    const weekStart = currentWeekDates[0];
    const weekEnd = currentWeekDates[6];
    const weekDisplay = `Week of ${monthNames[weekStart.getMonth()].substring(0, 3)} ${weekStart.getDate()}-${weekEnd.getDate()}`;
    document.getElementById('currentWeek').textContent = weekDisplay;
}

// Update work day dropdown with actual dates
function updateWorkDayOptions() {
    const workDaySelect = document.getElementById('workDay');
    workDaySelect.innerHTML = '';
    
    currentWeekDates.forEach((date, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = `${dayNames[date.getDay()]} ${date.getDate()}/${date.getMonth() + 1}`;
        workDaySelect.appendChild(option);
    });
}

function renderSchedule() {
    const grid = document.getElementById('scheduleGrid');
    grid.innerHTML = '';
    
    // Add corner cell
    const corner = document.createElement('div');
    corner.className = 'day-header';
    corner.textContent = 'Time';
    grid.appendChild(corner);
    
    // Add day headers with dates
    currentWeekDates.forEach(date => {
        const header = document.createElement('div');
        header.className = 'day-header';
        header.innerHTML = `<div>${dayNames[date.getDay()].substring(0, 3)}</div><div style="font-size: 0.8em; margin-top: 2px;">${date.getDate()}/${date.getMonth() + 1}</div>`;
        grid.appendChild(header);
    });
    
    // Add time slots
    hours.forEach(hour => {
        const timeLabel = document.createElement('div');
        timeLabel.className = 'time-label';
        timeLabel.textContent = `${hour.toString().padStart(2, '0')}:00`;
        grid.appendChild(timeLabel);
        
        currentWeekDates.forEach(date => {
            const dateKey = formatDateKey(date);
            const slot = document.createElement('div');
            const activity = schedule[dateKey] ? schedule[dateKey][hour] : '';
            slot.className = `time-slot ${activity}`;
            slot.textContent = activity ? activity.charAt(0).toUpperCase() + activity.slice(1) : '';
            slot.onclick = () => toggleSlot(dateKey, hour);
            grid.appendChild(slot);
        });
    });
    
    updateStats();
}

function toggleSlot(dateKey, hour) {
    if (!schedule[dateKey]) {
        schedule[dateKey] = {};
    }
    const current = schedule[dateKey][hour] || '';
    const options = ['', 'work', 'sleep', 'eating', 'grappling', 'lifting'];
    const currentIndex = options.indexOf(current);
    schedule[dateKey][hour] = options[(currentIndex + 1) % options.length];
    saveSchedule();
    renderSchedule();
}

function addWorkBlock() {
    const dayIndex = document.getElementById('workDay').value;
    const selectedDate = currentWeekDates[dayIndex];
    const dateKey = formatDateKey(selectedDate);
    const startTime = document.getElementById('workStart').value;
    const endTime = document.getElementById('workEnd').value;
    
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    
    if (!schedule[dateKey]) {
        schedule[dateKey] = {};
    }
    
    for (let h = startHour; h < endHour; h++) {
        schedule[dateKey][h] = 'work';
    }
    
    saveSchedule();
    renderSchedule();
}

function generateSchedule() {
    const priority = document.getElementById('trainingPriority').value;
    const sessionLength = parseInt(document.getElementById('sessionLength').value) / 60;
    
    // Clear existing training and eating for current week
    currentWeekDates.forEach(date => {
        const dateKey = formatDateKey(date);
        if (!schedule[dateKey]) schedule[dateKey] = {};
        
        hours.forEach(hour => {
            if (schedule[dateKey][hour] === 'grappling' || 
                schedule[dateKey][hour] === 'lifting' || 
                schedule[dateKey][hour] === 'eating') {
                schedule[dateKey][hour] = '';
            }
        });
    });
    
    // Add meal times (1 hour each)
    currentWeekDates.forEach(date => {
        const dateKey = formatDateKey(date);
        // Breakfast at 7 AM
        if (schedule[dateKey][7] === '') schedule[dateKey][7] = 'eating';
        // Lunch at 12 PM
        if (schedule[dateKey][12] === '') schedule[dateKey][12] = 'eating';
        // Dinner at 6 PM
        if (schedule[dateKey][18] === '') schedule[dateKey][18] = 'eating';
    });
    
    // Determine training distribution
    let grapplingDays = 3;
    let liftingDays = 3;
    
    if (priority === 'grappling') {
        grapplingDays = 4;
        liftingDays = 2;
    } else if (priority === 'lifting') {
        grapplingDays = 2;
        liftingDays = 4;
    }
    
    // Schedule training sessions
    let grapplingScheduled = 0;
    let liftingScheduled = 0;
    
    // Try to schedule training in preferred time slots
    const preferredTimes = [19, 20, 17, 18, 10, 11, 15, 16]; // Evening priority, then morning/afternoon
    
    currentWeekDates.forEach((date, dayIndex) => {
        const dateKey = formatDateKey(date);
        
        if (grapplingScheduled < grapplingDays) {
            for (let time of preferredTimes) {
                let canSchedule = true;
                for (let h = 0; h < sessionLength; h++) {
                    if (schedule[dateKey][time + h] !== '') {
                        canSchedule = false;
                        break;
                    }
                }
                
                if (canSchedule && time + sessionLength <= 22) {
                    for (let h = 0; h < sessionLength; h++) {
                        schedule[dateKey][time + h] = 'grappling';
                    }
                    grapplingScheduled++;
                    break;
                }
            }
        }
        
        if (liftingScheduled < liftingDays && dayIndex > 0) {
            const alternateDateKey = formatDateKey(currentWeekDates[(dayIndex + 3) % 7]);
            for (let time of preferredTimes) {
                let canSchedule = true;
                for (let h = 0; h < sessionLength; h++) {
                    if (schedule[alternateDateKey][time + h] !== '') {
                        canSchedule = false;
                        break;
                    }
                }
                
                if (canSchedule && time + sessionLength <= 22) {
                    for (let h = 0; h < sessionLength; h++) {
                        schedule[alternateDateKey][time + h] = 'lifting';
                    }
                    liftingScheduled++;
                    break;
                }
            }
        }
    });
    
    saveSchedule();
    renderSchedule();
}

function clearSchedule() {
    initSchedule();
}

function updateStats() {
    let workHours = 0;
    let grapplingHours = 0;
    let liftingHours = 0;
    let sleepHours = 0;
    
    currentWeekDates.forEach(date => {
        const dateKey = formatDateKey(date);
        if (schedule[dateKey]) {
            hours.forEach(hour => {
                switch(schedule[dateKey][hour]) {
                    case 'work': workHours++; break;
                    case 'grappling': grapplingHours++; break;
                    case 'lifting': liftingHours++; break;
                    case 'sleep': sleepHours++; break;
                }
            });
        }
    });
    
    document.getElementById('workHours').textContent = workHours;
    document.getElementById('grapplingHours').textContent = grapplingHours;
    document.getElementById('liftingHours').textContent = liftingHours;
    document.getElementById('sleepHours').textContent = sleepHours;
}

// Navigate months
function navigateMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    saveSchedule();
    initSchedule();
}

// Navigate weeks
function navigateWeek(direction) {
    currentDate.setDate(currentDate.getDate() + (direction * 7));
    saveSchedule();
    initSchedule();
}

// Toggle controls visibility
function toggleControls() {
    const controlsContent = document.getElementById('controlsContent');
    const toggleIcon = document.getElementById('toggleIcon');
    
    controlsContent.classList.toggle('collapsed');
    toggleIcon.classList.toggle('collapsed');
    
    if (controlsContent.classList.contains('collapsed')) {
        toggleIcon.textContent = '▶';
    } else {
        toggleIcon.textContent = '▼';
    }
}

// Export schedule data
function exportSchedule() {
    const dataToExport = {
        schedule: schedule,
        currentDate: currentDate.toISOString(),
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `training-schedule-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

// Import schedule data
function importSchedule(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        try {
            const importedData = JSON.parse(e.target.result);
            
            if (importedData.schedule) {
                schedule = importedData.schedule;
                
                if (importedData.currentDate) {
                    currentDate = new Date(importedData.currentDate);
                }
                
                saveSchedule();
                initSchedule();
                alert('Schedule imported successfully!');
            } else {
                alert('Invalid schedule file format.');
            }
        } catch (error) {
            alert('Error importing schedule: ' + error.message);
        }
    };
    reader.readAsText(file);
    
    // Clear the file input
    event.target.value = '';
}

// Clear current week schedule
function clearSchedule() {
    currentWeekDates.forEach(date => {
        const dateKey = formatDateKey(date);
        schedule[dateKey] = {};
        hours.forEach(hour => {
            schedule[dateKey][hour] = '';
        });
        
        // Add default sleep hours (11 PM - 7 AM)
        for (let h = 23; h < 24; h++) schedule[dateKey][h] = 'sleep';
        for (let h = 0; h < 7; h++) schedule[dateKey][h] = 'sleep';
    });
    
    saveSchedule();
    renderSchedule();
}

// PWA Install Prompt
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    showInstallButton();
});

function showInstallButton() {
    const installButton = document.createElement('button');
    installButton.textContent = '📱 Install App';
    installButton.className = 'install-button';
    installButton.onclick = installApp;
    
    const container = document.querySelector('.container');
    container.insertBefore(installButton, container.firstChild);
}

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                document.querySelector('.install-button').remove();
            }
            deferredPrompt = null;
        });
    }
}

// Initialize on load
initSchedule();