// State management
let state = {
    startTime: null,
    regularHours: 3,
    weekendHours: 8,
    hasNotified: false,
    extraTime: 0
};

// Load state from localStorage
function loadState() {
    const saved = localStorage.getItem('timeTrackerState');
    if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.startTime) {
            parsed.startTime = new Date(parsed.startTime);
        }
        state = { ...state, ...parsed };
        
        // Update UI with saved values
        if (state.startTime) {
            const hours = state.startTime.getHours().toString().padStart(2, '0');
            const minutes = state.startTime.getMinutes().toString().padStart(2, '0');
            document.getElementById('startTimeInput').value = `${hours}:${minutes}`;
        }
        document.getElementById('regularHours').value = state.regularHours;
        document.getElementById('weekendHours').value = state.weekendHours || state.saturdayHours || 8;
        if (state.extraTime !== 0) {
            document.getElementById('extraHours').value = state.extraTime;
        }
    }
    
    // Check if it's a new day and reset if needed
    checkNewDay();
}

// Save state to localStorage
function saveState() {
    localStorage.setItem('timeTrackerState', JSON.stringify(state));
}

// Check if it's a new day
function checkNewDay() {
    const today = new Date().toDateString();
    const lastDay = localStorage.getItem('lastWorkDay');
    
    if (lastDay && lastDay !== today) {
        // Reset for new day
        state.startTime = null;
        state.hasNotified = false;
        state.extraTime = 0;
        saveState();
    }
    
    localStorage.setItem('lastWorkDay', today);
}

// Start work
function startWork() {
    const startTimeInput = document.getElementById('startTimeInput').value;
    const regularHours = parseFloat(document.getElementById('regularHours').value) || 3;
    const weekendHours = parseFloat(document.getElementById('weekendHours').value) || 8;
    
    if (!startTimeInput) {
        showNotification('Please enter a start time', 'error');
        return;
    }
    
    const [hours, minutes] = startTimeInput.split(':').map(Number);
    state.startTime = new Date();
    state.startTime.setHours(hours, minutes, 0, 0);
    state.regularHours = regularHours;
    state.weekendHours = weekendHours;
    state.hasNotified = false;
    state.extraTime = 0;
    document.getElementById('extraHours').value = 0;
    
    saveState();
    showNotification('Work day started!', 'success');
}

// Reset day
function resetDay() {
    if (confirm('Are you sure you want to reset today\'s data?')) {
        state.startTime = null;
        state.hasNotified = false;
        state.extraTime = 0;
        document.getElementById('startTimeInput').value = '';
        document.getElementById('extraHours').value = 0;
        saveState();
        showNotification('Day reset', 'info');
    }
}

// Apply extra time
function applyExtraTime() {
    if (!state.startTime) {
        showNotification('Please start work first', 'error');
        return;
    }
    
    const extraHours = parseFloat(document.getElementById('extraHours').value) || 0;
    state.extraTime = extraHours;
    saveState();
    
    if (extraHours > 0) {
        showNotification(`Added ${extraHours} extra hours`, 'success');
    } else if (extraHours < 0) {
        showNotification(`Deducted ${Math.abs(extraHours)} hours`, 'success');
    } else {
        showNotification('Extra time reset', 'info');
    }
    
    updateDisplay();
}

// Convert to 12-hour format
function formatTime12Hour(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    return { hours: hours.toString().padStart(2, '0'), minutes, seconds, ampm };
}

// Format time without seconds
function formatTime12HourShort(date) {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    return `${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
}

// Update display
function updateDisplay() {
    const now = new Date();
    const currentTimeDiv = document.getElementById('currentTime');
    const timeLeftDiv = document.getElementById('timeLeft');
    const leaveTimeDiv = document.getElementById('leaveTime');
    const progressBar = document.getElementById('progressBar');
    const progressText = document.getElementById('progressText');
    const startTimeDisplay = document.getElementById('startTimeDisplay');
    const overtimeCard = document.getElementById('overtimeCard');
    const overtimeDisplay = document.getElementById('overtimeDisplay');
    
    // Update current time in 12-hour format
    const currentTime = formatTime12Hour(now);
    currentTimeDiv.textContent = `${currentTime.hours}:${currentTime.minutes}:${currentTime.seconds} ${currentTime.ampm}`;
    
    if (!state.startTime) {
        timeLeftDiv.textContent = 'Ready to start';
        leaveTimeDiv.textContent = 'Enter your start time to begin tracking';
        progressBar.style.width = '0%';
        progressText.textContent = '0%';
        startTimeDisplay.textContent = '--:--';
        overtimeCard.style.display = 'none';
        document.title = 'Time Tracker';
        return;
    }
    
    // Display start time in 12-hour format
    startTimeDisplay.textContent = formatTime12HourShort(state.startTime);
    
    // Calculate work hours based on day
    // 0 = Sunday, 1 = Monday, ... 5 = Friday, 6 = Saturday
    // Weekend (Friday & Saturday) = 8 hours, Regular (Sunday-Thursday) = 3 hours
    const dayOfWeek = now.getDay();
    const isWeekend = (dayOfWeek === 5 || dayOfWeek === 6); // Friday or Saturday
    const requiredHours = isWeekend ? state.weekendHours : state.regularHours;
    const requiredMs = requiredHours * 60 * 60 * 1000;
    
    // Calculate leave time (with extra time adjustment)
    const adjustedRequiredMs = requiredMs - (state.extraTime * 60 * 60 * 1000);
    const leaveTime = new Date(state.startTime.getTime() + adjustedRequiredMs);
    
    // Calculate actual worked time (including extra time)
    let workedMs = now - state.startTime + (state.extraTime * 60 * 60 * 1000);
    if (workedMs < 0) workedMs = 0;
    
    // Calculate time left
    const timeLeftMs = leaveTime - now;
    
    // Calculate progress
    const progress = Math.min(100, (workedMs / requiredMs) * 100);
    progressBar.style.width = `${progress}%`;
    progressText.textContent = `${Math.floor(progress)}%`;
    
    // Format leave time in 12-hour format
    leaveTimeDiv.textContent = `You can leave at ${formatTime12HourShort(leaveTime)}`;
    
    // Update time left display
    if (timeLeftMs > 0) {
        const hoursLeft = Math.floor(timeLeftMs / (1000 * 60 * 60));
        const minutesLeft = Math.floor((timeLeftMs % (1000 * 60 * 60)) / (1000 * 60));
        const secondsLeft = Math.floor((timeLeftMs % (1000 * 60)) / 1000);
        
        let extraTimeDisplay = state.extraTime !== 0 ? ` (${state.extraTime > 0 ? '+' : ''}${state.extraTime}h)` : '';
        timeLeftDiv.textContent = `${hoursLeft}h ${minutesLeft}m ${secondsLeft}s remaining${extraTimeDisplay}`;
        document.title = `${hoursLeft}h ${minutesLeft}m ${secondsLeft}s - Time Tracker`;
        
        // Hide overtime card when not in overtime
        overtimeCard.style.display = 'none';
        timeLeftDiv.classList.remove('overtime');
    } else {
        // Calculate overtime
        const overtimeMs = Math.abs(timeLeftMs);
        const overtimeHours = Math.floor(overtimeMs / (1000 * 60 * 60));
        const overtimeMinutes = Math.floor((overtimeMs % (1000 * 60 * 60)) / (1000 * 60));
        const overtimeSeconds = Math.floor((overtimeMs % (1000 * 60)) / 1000);
        
        timeLeftDiv.textContent = '🎉 Time to go home!';
        timeLeftDiv.classList.add('overtime');
        
        // Show and update overtime card
        overtimeCard.style.display = 'block';
        overtimeDisplay.textContent = `${overtimeHours}h ${overtimeMinutes}m ${overtimeSeconds}s`;
        
        // Update title with overtime
        document.title = `Overtime: ${overtimeHours}h ${overtimeMinutes}m - Time Tracker`;
        
        // Send notification only once
        if (!state.hasNotified) {
            sendNotification('Work Complete!', 'Your work hours are complete. Time to go home!');
            state.hasNotified = true;
            saveState();
        }
    }
    
    // Update stats
    updateStats(workedMs);
}

// Update statistics
function updateStats(workedMs) {
    // Today's work (including extra time)
    const hoursToday = workedMs / (1000 * 60 * 60);
    document.getElementById('workedToday').textContent = `${hoursToday.toFixed(1)}h`;
    
    // Calculate required hours for today
    const now = new Date();
    const dayOfWeek = now.getDay();
    const isWeekend = (dayOfWeek === 5 || dayOfWeek === 6); // Friday or Saturday
    const requiredHours = isWeekend ? state.weekendHours : state.regularHours;
    
    // Progress percentage
    const progress = Math.min(100, (hoursToday / requiredHours) * 100);
    document.getElementById('productivity').textContent = `${Math.floor(progress)}%`;
}

// Theme toggle
function toggleTheme() {
    const html = document.documentElement;
    const themeIcon = document.getElementById('themeIcon');
    const currentTheme = html.getAttribute('data-theme');
    
    if (currentTheme === 'dark') {
        html.removeAttribute('data-theme');
        themeIcon.textContent = '🌙';
        localStorage.setItem('theme', 'light');
    } else {
        html.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
        localStorage.setItem('theme', 'dark');
    }
}

// Load theme
function loadTheme() {
    const savedTheme = localStorage.getItem('theme');
    const themeIcon = document.getElementById('themeIcon');
    
    if (savedTheme === 'dark') {
        document.documentElement.setAttribute('data-theme', 'dark');
        themeIcon.textContent = '☀️';
    } else {
        themeIcon.textContent = '🌙';
    }
}

// Show notification
function showNotification(message, type = 'info') {
    const notification = document.getElementById('notification');
    notification.textContent = message;
    notification.className = 'notification show';
    
    if (type === 'error') {
        notification.style.background = 'var(--danger-color)';
    } else if (type === 'success') {
        notification.style.background = 'var(--secondary-color)';
    } else {
        notification.style.background = 'var(--primary-color)';
    }
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// Create and play a pleasant chime sound using Web Audio API
function playNotificationSound() {
    try {
        // Create audio context
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        
        // Create the notes for a pleasant chime (C-E-G-C chord)
        const notes = [
            { freq: 523.25, time: 0, duration: 0.3 },      // C5
            { freq: 659.25, time: 0.1, duration: 0.3 },    // E5
            { freq: 783.99, time: 0.2, duration: 0.3 },    // G5
            { freq: 1046.50, time: 0.3, duration: 0.5 }    // C6
        ];
        
        notes.forEach(note => {
            // Create oscillator for each note
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            // Use sine wave for pleasant sound
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(note.freq, audioContext.currentTime + note.time);
            
            // Create envelope for smooth sound
            gainNode.gain.setValueAtTime(0, audioContext.currentTime + note.time);
            gainNode.gain.linearRampToValueAtTime(0.3, audioContext.currentTime + note.time + 0.02);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + note.time + note.duration);
            
            // Connect nodes
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Play the note
            oscillator.start(audioContext.currentTime + note.time);
            oscillator.stop(audioContext.currentTime + note.time + note.duration);
        });
        
        // Add a subtle bell resonance
        const resonance = audioContext.createOscillator();
        const resonanceGain = audioContext.createGain();
        
        resonance.type = 'triangle';
        resonance.frequency.setValueAtTime(2093, audioContext.currentTime); // C7
        
        resonanceGain.gain.setValueAtTime(0, audioContext.currentTime);
        resonanceGain.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.05);
        resonanceGain.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 1.5);
        
        resonance.connect(resonanceGain);
        resonanceGain.connect(audioContext.destination);
        
        resonance.start(audioContext.currentTime);
        resonance.stop(audioContext.currentTime + 1.5);
        
    } catch (e) {
        console.log('Could not play sound:', e);
        // Fallback to simple beep
        playFallbackBeep();
    }
}

// Fallback beep sound if Web Audio API fails
function playFallbackBeep() {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.frequency.value = 800;
    oscillator.type = 'sine';
    
    gainNode.gain.value = 0.3;
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.5);
}

// Send browser notification with sound
function sendNotification(title, body) {
    // Play sound regardless of notification permission
    playNotificationSound();
    
    // Try to show browser notification if permitted
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: body,
            icon: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">⏰</text></svg>',
            requireInteraction: true,
            vibrate: [200, 100, 200]
        });
        
        // Auto-close after 10 seconds
        setTimeout(() => notification.close(), 10000);
        
        // Handle click - focus the window
        notification.onclick = function() {
            window.focus();
            this.close();
        };
    }
}

// Request notification permission smartly
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        // Only ask once per session, not persist in localStorage
        if (!window.notificationAsked) {
            window.notificationAsked = true;
            // Delay request to not annoy user immediately
            setTimeout(() => {
                Notification.requestPermission();
            }, 5000);
        }
    }
}


// Initialize
function init() {
    loadTheme();
    loadState();
    updateDisplay();
    
    // Request notification permission after a delay
    requestNotificationPermission();
    
    // Update every second
    setInterval(updateDisplay, 1000);
    
    // Save state every minute
    setInterval(saveState, 60000);
    
    // Check for new day every hour
    setInterval(checkNewDay, 3600000);
}

// Start the app
init();