// --- Core Time & Persistence Logic ---
function getMondayOfCurrentWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
    return new Date(d.setDate(diff)).setHours(0,0,0,0);
}

// Initialize Local Storage Databases
let appMeta = JSON.parse(localStorage.getItem('acuityMeta')) || { currentWeekStart: getMondayOfCurrentWeek(new Date()) };
let habits = JSON.parse(localStorage.getItem('acuityHabits')) || [];
let tasks = JSON.parse(localStorage.getItem('acuityTasksList')) || [];

// --- WEEKLY ROLLOVER CHECK ---
const thisMonday = getMondayOfCurrentWeek(new Date());

if (appMeta.currentWeekStart !== thisMonday) {
    console.log("New week detected! Archiving last week's data...");
    habits.forEach(h => {
        h.lastWeekCount = h.days.filter(Boolean).length;
        h.days = [false, false, false, false, false, false, false];
    });
    appMeta.currentWeekStart = thisMonday;
    localStorage.setItem('acuityMeta', JSON.stringify(appMeta));
    localStorage.setItem('acuityHabits', JSON.stringify(habits));
}

document.getElementById('dateDisplay').innerText = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// --- Tab Switching Logic ---
function switchTab(tabId) {
    document.querySelectorAll('.neo-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.getElementById(`tabBtn-${tabId}`).classList.add('active');

    document.querySelectorAll('.tab-content').forEach(content => content.classList.add('hidden'));
    document.getElementById(`tab-${tabId}`).classList.remove('hidden');

    if(tabId === 'focus') setTimeout(resizeGraph, 50);
    else if (tabId === 'habits') setTimeout(resizeHabitsGraph, 50);
}

// --- HABITS & TRENDS LOGIC ---
function addHabit() {
    const input = document.getElementById('habitInput');
    const title = input.value.trim();
    if(!title) return;

    habits.push({ id: generateId(), title: title, days: [false, false, false, false, false, false, false], lastWeekCount: 0 });
    input.value = '';
    saveHabits();
}

function toggleHabitDay(habitId, dayIndex) {
    const habit = habits.find(h => h.id === habitId);
    if(habit) {
        habit.days[dayIndex] = !habit.days[dayIndex];
        saveHabits();
    }
}

function deleteHabit(id) {
    habits = habits.filter(h => h.id !== id);
    saveHabits();
}

function saveHabits() {
    localStorage.setItem('acuityHabits', JSON.stringify(habits));
    renderHabits();
    updateTrends();
}

function updateTrends() {
    const trendDisplay = document.getElementById('trendDisplay');
    const trendDesc = document.getElementById('trendDesc');

    if (habits.length === 0) {
        trendDisplay.innerHTML = `--% <i class="ph ph-minus"></i>`;
        trendDisplay.className = "text-5xl font-black font-display text-navy flex items-center gap-2";
        trendDesc.innerText = "No habits tracked yet";
        return;
    }

    let currentWeekTotal = 0;
    let lastWeekTotal = 0;

    habits.forEach(h => {
        currentWeekTotal += h.days.filter(Boolean).length;
        lastWeekTotal += (h.lastWeekCount || 0);
    });

    if (lastWeekTotal === 0 && currentWeekTotal > 0) {
        trendDisplay.innerHTML = `+100% <i class="ph ph-trend-up"></i>`;
        trendDisplay.className = "text-5xl font-black font-display text-brand-green flex items-center gap-2";
        trendDesc.innerText = `Completed ${currentWeekTotal} tasks (Up from 0)`;
    } else if (lastWeekTotal === 0 && currentWeekTotal === 0) {
        trendDisplay.innerHTML = `0% <i class="ph ph-minus"></i>`;
        trendDisplay.className = "text-5xl font-black font-display text-navy flex items-center gap-2";
        trendDesc.innerText = `Awaiting action`;
    } else {
        const percentChange = Math.round(((currentWeekTotal - lastWeekTotal) / lastWeekTotal) * 100);
        
        if (percentChange > 0) {
            trendDisplay.innerHTML = `+${percentChange}% <i class="ph ph-trend-up"></i>`;
            trendDisplay.className = "text-5xl font-black font-display text-brand-green flex items-center gap-2";
        } else if (percentChange < 0) {
            trendDisplay.innerHTML = `${percentChange}% <i class="ph ph-trend-down"></i>`;
            trendDisplay.className = "text-5xl font-black font-display text-brand-red flex items-center gap-2";
        } else {
            trendDisplay.innerHTML = `0% <i class="ph ph-minus"></i>`;
            trendDisplay.className = "text-5xl font-black font-display text-navy flex items-center gap-2";
        }
        trendDesc.innerText = `${currentWeekTotal} this week vs ${lastWeekTotal} last week`;
    }
}

function renderHabits() {
    const list = document.getElementById('habitList');
    list.innerHTML = '';
    
    if(habits.length === 0) {
        list.innerHTML = `<tr><td colspan="9" class="text-center p-8 text-navy-light font-bold opacity-50 border-2 border-dashed border-navy">No habits tracked yet.</td></tr>`;
        drawHabitsGraph();
        updateTrends();
        return;
    }

    habits.forEach(habit => {
        let checkboxesHTML = '';
        for(let i=0; i<7; i++) {
            checkboxesHTML += `<td class="text-center py-4"><input type="checkbox" class="habit-checkbox" ${habit.days[i] ? 'checked' : ''} onchange="toggleHabitDay('${habit.id}', ${i})"></td>`;
        }

        list.innerHTML += `
            <tr class="border-b-2 border-navy border-opacity-20 hover:bg-white transition-colors">
                <td class="py-4 font-bold text-navy text-lg">${habit.title}</td>
                ${checkboxesHTML}
                <td class="text-right py-4">
                    <button onclick="deleteHabit('${habit.id}')" class="text-navy-light hover:text-brand-red transition-colors"><i class="ph ph-trash text-xl"></i></button>
                </td>
            </tr>
        `;
    });
    
    drawHabitsGraph();
    updateTrends();
}

// Weekly Consistency Graph Logic
const habitsCanvas = document.getElementById('habitsGraphCanvas');
const habitsCtx = habitsCanvas ? habitsCanvas.getContext('2d') : null;

if (habitsCanvas) habitsCanvas.style.transform = 'scaleX(1)';

function drawHabitsGraph() {
    if (!habitsCtx || !habitsCanvas) return;
    const w = habitsCanvas.width;
    const h = habitsCanvas.height;
    habitsCtx.clearRect(0, 0, w, h);

    if(habits.length === 0) return;

    const days = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    const completedCounts = [0, 0, 0, 0, 0, 0, 0];

    habits.forEach(h => {
        for(let i=0; i<7; i++) {
            if(h.days[i]) completedCounts[i]++;
        }
    });

    const maxHabits = Math.max(habits.length, 1);
    const barWidth = Math.min(40, (w / 7) - 20);
    const spacing = w / 7;

    habitsCtx.font = "bold 12px 'JetBrains Mono'";
    habitsCtx.textAlign = "center";
    habitsCtx.fillStyle = "#0F172A";

    for(let i=0; i<7; i++) {
        const x = (i * spacing) + (spacing / 2);
        const barHeight = (completedCounts[i] / maxHabits) * (h - 40);
        const y = h - 20 - barHeight;

        habitsCtx.fillText(days[i], x, h - 2);

        if (barHeight > 0) {
            habitsCtx.fillStyle = '#0F172A';
            habitsCtx.fillRect(x - barWidth/2 + 4, y + 4, barWidth, barHeight);
            habitsCtx.fillStyle = '#1E3A8A';
            habitsCtx.fillRect(x - barWidth/2, y, barWidth, barHeight);
            habitsCtx.strokeStyle = '#0F172A';
            habitsCtx.lineWidth = 3;
            habitsCtx.strokeRect(x - barWidth/2, y, barWidth, barHeight);
            habitsCtx.fillStyle = '#0F172A';
            habitsCtx.fillText(completedCounts[i], x, y - 8);
        }
    }
}

function resizeHabitsGraph() {
    if(!habitsCanvas || !habitsCanvas.parentElement) return;
    const rect = habitsCanvas.parentElement.getBoundingClientRect();
    habitsCanvas.width = rect.width;
    habitsCanvas.height = rect.height;
    drawHabitsGraph();
}
window.addEventListener('resize', resizeHabitsGraph);

// --- TASKS LOGIC ---
function addTask() {
    const titleInput = document.getElementById('taskInput');
    const dateInput = document.getElementById('taskDate');
    const title = titleInput.value.trim();
    if(!title) return;

    tasks.push({ id: generateId(), title: title, deadline: dateInput.value, completed: false, completedAt: null });
    titleInput.value = ''; dateInput.value = '';
    saveTasks();
}

function toggleTaskComplete(id) {
    const task = tasks.find(t => t.id === id);
    if(task) {
        task.completed = !task.completed;
        task.completedAt = task.completed ? Date.now() : null;
        saveTasks();
    }
}

function deleteTask(id) {
    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
}

function saveTasks() {
    tasks.sort((a, b) => {
        if (a.completed === b.completed) {
            if(!a.deadline) return 1;
            if(!b.deadline) return -1;
            return new Date(a.deadline) - new Date(b.deadline);
        }
        return a.completed ? 1 : -1;
    });
    localStorage.setItem('acuityTasksList', JSON.stringify(tasks));
    renderTasks();
}

function renderTasks() {
    const list = document.getElementById('taskList');
    list.innerHTML = '';

    if(tasks.length === 0) {
        list.innerHTML = `<div class="col-span-1 md:col-span-2 text-center text-navy-light font-bold p-8 border-2 border-dashed border-navy rounded-lg opacity-50">No upcoming tasks.</div>`;
        return;
    }

    tasks.forEach(task => {
        const dateObj = task.deadline ? new Date(task.deadline) : null;
        const dateStr = dateObj ? dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'No Deadline';
        const isOverdue = dateObj && dateObj < new Date() && !task.completed;
        const deadlineColor = task.completed ? 'text-navy-light' : (isOverdue ? 'text-brand-red' : 'text-brand-blue');

        list.innerHTML += `
            <div class="neo-panel p-5 flex flex-col justify-between ${task.completed ? 'bg-beige opacity-60' : 'bg-white'}">
                <div class="flex items-start justify-between gap-3 mb-4">
                    <div class="flex items-start gap-3">
                        <button onclick="toggleTaskComplete('${task.id}')" class="mt-1 w-6 h-6 rounded border-2 border-navy flex items-center justify-center bg-white ${task.completed ? 'bg-navy text-white' : ''}">
                            ${task.completed ? '<i class="ph ph-check font-bold"></i>' : ''}
                        </button>
                        <div>
                            <h4 class="font-bold text-navy text-xl leading-tight ${task.completed ? 'line-through text-navy-light' : ''}">${task.title}</h4>
                        </div>
                    </div>
                    <button onclick="deleteTask('${task.id}')" class="text-navy-light hover:text-brand-red"><i class="ph ph-trash text-xl"></i></button>
                </div>
                <div class="flex justify-between items-center border-t-2 border-navy border-opacity-20 pt-3">
                    <span class="font-mono text-xs font-black uppercase tracking-widest flex items-center gap-1 ${deadlineColor}">
                        <i class="ph ph-calendar"></i> ${dateStr} ${isOverdue ? '(OVERDUE)' : ''}
                    </span>
                </div>
            </div>
        `;
    });
}


// --- FOCUS ENGINE LOGIC ---
const videoElement = document.getElementById('input_video');
const canvasElement = document.getElementById('output_canvas');
const canvasCtx = canvasElement.getContext('2d');
const loadingOverlay = document.getElementById('loadingOverlay');
const videoPlaceholder = document.getElementById('videoPlaceholder');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const statusText = document.getElementById('statusText');
const scoreBar = document.getElementById('scoreBar');

const graphCanvas = document.getElementById('graphCanvas');
const graphCtx = graphCanvas.getContext('2d');
if (graphCanvas) graphCanvas.style.transform = 'scaleX(1)';

// --- THE FIX: OFF-SCREEN MIDDLEMAN CANVAS ---
const offscreenCanvas = document.createElement('canvas');
const offscreenCtx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
offscreenCanvas.width = 640;
offscreenCanvas.height = 480;

// AI State
let isRunning = false;
let isInitializing = false; 
let nativeStream = null; 
let faceMesh = null;
let currentScore = 0;
let smoothedScore = 0;
let currentState = 'standby'; 

// Telemetry State
let sessionTimer = null;
let totalTimeSec = 0;
let unfocusedSeconds = 0;
let onCameraSec = 0;
let offCameraSec = 0;
let breaksCount = 0;

const maxGraphPoints = 100;
let scoreHistory = new Array(maxGraphPoints).fill(0);

function formatTime(seconds) {
    const mins = String(Math.floor(seconds / 60)).padStart(2, '0');
    const secs = String(seconds % 60).padStart(2, '0');
    return `${mins}:${secs}`;
}

// --- Graph ---
function resizeGraph() {
    if(!graphCanvas.parentElement) return;
    const rect = graphCanvas.parentElement.getBoundingClientRect();
    graphCanvas.width = rect.width;
    graphCanvas.height = rect.height;
    drawGraph();
}
window.addEventListener('resize', resizeGraph);

function drawGraph() {
    if (!graphCtx) return;
    const w = graphCanvas.width;
    const h = graphCanvas.height;
    
    graphCtx.clearRect(0, 0, w, h);
    
    graphCtx.strokeStyle = 'rgba(15, 23, 42, 0.1)';
    graphCtx.lineWidth = 1;
    graphCtx.beginPath();
    graphCtx.moveTo(0, h/2); graphCtx.lineTo(w, h/2);
    graphCtx.moveTo(0, h/4); graphCtx.lineTo(w, h/4);
    graphCtx.moveTo(0, h*0.75); graphCtx.lineTo(w, h*0.75);
    graphCtx.stroke();

    graphCtx.beginPath();
    graphCtx.strokeStyle = '#1E3A8A';
    graphCtx.lineWidth = 3;
    graphCtx.lineJoin = 'round';
    
    const step = w / (maxGraphPoints - 1);
    for (let i = 0; i < maxGraphPoints; i++) {
        const x = i * step;
        const y = h - (scoreHistory[i] / 100) * h;
        if (i === 0) graphCtx.moveTo(x, y);
        else graphCtx.lineTo(x, y);
    }
    graphCtx.stroke();
}

// --- Core Analysis ---
function calculateAttentionScore(landmarks) {
    const nose = landmarks[1];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const chin = landmarks[152];
    const forehead = landmarks[10];

    const distLeft = Math.sqrt(Math.pow(nose.x - leftEye.x, 2) + Math.pow(nose.y - leftEye.y, 2));
    const distRight = Math.sqrt(Math.pow(nose.x - rightEye.x, 2) + Math.pow(nose.y - rightEye.y, 2));
    const yawRatio = distLeft / (distLeft + distRight);
    
    const distUp = Math.sqrt(Math.pow(nose.x - forehead.x, 2) + Math.pow(nose.y - forehead.y, 2));
    const distDown = Math.sqrt(Math.pow(nose.x - chin.x, 2) + Math.pow(nose.y - chin.y, 2));
    const pitchRatio = distUp / (distUp + distDown);

    const yawDeviation = Math.abs(yawRatio - 0.5) * 2;
    const pitchDeviation = Math.abs(pitchRatio - 0.45) * 2; 

    let totalDeviation = (yawDeviation * 0.7) + (pitchDeviation * 0.3);
    let rawScore = 100 - (totalDeviation * 150);
    return Math.max(0, Math.min(100, rawScore));
}

function updateStateUI() {
    smoothedScore = (smoothedScore * 0.8) + (currentScore * 0.2);
    const displayScore = Math.round(smoothedScore);

    scoreBar.style.width = `${displayScore}%`;
    scoreHistory.shift();
    scoreHistory.push(displayScore);
    drawGraph();

    let newState = 'focused';
    if (currentScore === 0 && !isRunning) newState = 'standby';
    else if (currentScore === 0) newState = 'missing';
    else if (displayScore < 40) newState = 'distracted';
    
    if (newState !== currentState) {
        currentState = newState;
        
        if (currentState === 'focused') {
            statusText.innerText = 'Flow State';
            statusText.className = 'text-4xl font-display font-black text-brand-green uppercase tracking-widest block mb-4';
            scoreBar.style.backgroundColor = '#047857';
        } 
        else if (currentState === 'distracted') {
            statusText.innerText = 'Wandering';
            statusText.className = 'text-4xl font-display font-black text-brand-amber uppercase tracking-widest block mb-4';
            scoreBar.style.backgroundColor = '#D97706';
        }
        else if (currentState === 'missing') {
            statusText.innerText = 'Absent';
            statusText.className = 'text-4xl font-display font-black text-brand-red uppercase tracking-widest block mb-4';
            scoreBar.style.backgroundColor = '#BE123C';
        }
    }
}

function onResults(results) {
    if (!isRunning) return;

    if (!loadingOverlay.classList.contains('hidden')) {
        loadingOverlay.classList.add('hidden');
        videoPlaceholder.classList.add('hidden');
        canvasElement.classList.remove('hidden');
        startBtn.classList.add('hidden');
        stopBtn.classList.remove('hidden');
        isInitializing = false; 
        
        if (!sessionTimer) {
            sessionTimer = setInterval(() => {
                totalTimeSec++;
                
                if(currentState === 'focused' || currentState === 'standby') {
                    unfocusedSeconds = 0;
                } else {
                    unfocusedSeconds++;
                    if (unfocusedSeconds === 5) {
                        breaksCount++;
                        document.getElementById('uiBreaks').innerText = breaksCount;
                    }
                }

                if(currentState === 'focused' || currentState === 'distracted') {
                    onCameraSec++;
                    document.getElementById('uiOnCamera').innerText = formatTime(onCameraSec);
                } else if(currentState === 'missing') {
                    offCameraSec++;
                    document.getElementById('uiOffCamera').innerText = formatTime(offCameraSec);
                }
            }, 1000);
        }
    }

    canvasElement.width = 640;
    canvasElement.height = 480;
    
    canvasCtx.save();
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
    
    if (results.image) {
        // Draw the raw camera feed natively
        canvasCtx.drawImage(results.image, 0, 0, canvasElement.width, canvasElement.height);
    }
    
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        
        // FEATURE UPGRADE: Removed the robotic tracking mesh lines.
        // The AI now works completely invisibly behind the scenes.
        // Users just see a clean mirror of themselves, making it feel native and premium.

        currentScore = calculateAttentionScore(landmarks);
    } else {
        currentScore = 0;
    }
    
    canvasCtx.restore();
    updateStateUI();
}

async function processVideoFrame() {
    if (!isRunning) return;
    try {
        if (videoElement.readyState >= 2 && faceMesh) {
            offscreenCtx.drawImage(videoElement, 0, 0, offscreenCanvas.width, offscreenCanvas.height);
            await faceMesh.send({ image: offscreenCanvas });
        }
    } catch (e) {
        // Suppressing console spam while it boots
    }
    requestAnimationFrame(processVideoFrame);
}

async function initModel() {
    if (isInitializing || isRunning) return; 
    isInitializing = true;
    
    const loadingTextObj = document.querySelector('#loadingOverlay p');
    loadingOverlay.classList.remove('hidden');
    
    totalTimeSec = 0; unfocusedSeconds = 0; onCameraSec = 0; offCameraSec = 0; breaksCount = 0;
    scoreHistory.fill(0);
    document.getElementById('uiOnCamera').innerText = "00:00";
    document.getElementById('uiOffCamera').innerText = "00:00";
    document.getElementById('uiBreaks').innerText = "0";

    try {
        if (loadingTextObj) loadingTextObj.innerText = "1/4: WAKING UP WEBCAM...";
        nativeStream = await navigator.mediaDevices.getUserMedia({
            video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: "user" }
        });

        videoElement.srcObject = nativeStream;
        videoElement.muted = true;
        videoElement.playsInline = true;
        
        videoElement.classList.remove('hidden');
        videoElement.style.cssText = 'position: fixed; top: -10000px; left: -10000px; width: 640px; height: 480px; z-index: -1; pointer-events: none;';

        if (loadingTextObj) loadingTextObj.innerText = "2/4: MOUNTING VIDEO FEED...";
        
        await Promise.race([
            new Promise((resolve) => {
                if (videoElement.readyState >= 2) { 
                    videoElement.play().then(resolve).catch(resolve);
                } else { 
                    videoElement.onloadeddata = () => {
                        videoElement.play().then(resolve).catch(resolve);
                    };
                }
            }),
            new Promise(resolve => setTimeout(resolve, 3000)) 
        ]);

        if(!faceMesh) {
            if (loadingTextObj) loadingTextObj.innerText = "3/4: FETCHING AI FILES...";
            faceMesh = new FaceMesh({locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`});
            faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
            faceMesh.onResults(onResults);
        }

        if (loadingTextObj) loadingTextObj.innerText = "4/4: COMPILING AI ENGINE (WAIT FOR IT)...";
        
        isRunning = true;
        processVideoFrame();

    } catch (error) {
        loadingOverlay.classList.add('hidden');
        isInitializing = false;
        console.error("NATIVE CAMERA ERROR:", error);
        
        let stepInfo = loadingTextObj ? `\nFailed at: ${loadingTextObj.innerText}` : "";
        
        if (error.name === "NotFoundError" || error.name === "OverconstrainedError") {
            alert("HARDWARE ERROR: Windows cannot detect any physical webcam plugged in." + stepInfo);
        } else if (error.name === "NotReadableError" || error.name === "TrackStartError") {
            alert("HARDWARE CONFLICT: Your camera is blocked by Antivirus or being used by Zoom/Teams/Discord/OBS." + stepInfo);
        } else if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
            alert("PERMISSION ERROR: You blocked camera access in your browser settings." + stepInfo);
        } else {
            alert("Initialization Failed: " + (error.message || "Unknown error.") + stepInfo);
        }
    }
}

function endSession() {
    isRunning = false;
    isInitializing = false;
    
    if (nativeStream) {
        nativeStream.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
    }
    
    clearInterval(sessionTimer);
    sessionTimer = null; 
    
    canvasElement.classList.add('hidden');
    videoPlaceholder.classList.remove('hidden');
    startBtn.classList.remove('hidden');
    stopBtn.classList.add('hidden');
    
    currentScore = 0; smoothedScore = 0; currentState = 'standby';
    statusText.innerText = 'Standby';
    statusText.className = 'text-4xl font-display font-black text-navy uppercase tracking-widest block mb-4';
    scoreBar.style.backgroundColor = '#0F172A';
    canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);

    showSummary();
}

function showSummary() {
    document.getElementById('sumTotal').innerText = formatTime(totalTimeSec);
    document.getElementById('sumOnCamera').innerText = formatTime(onCameraSec);
    document.getElementById('sumOffCamera').innerText = formatTime(offCameraSec);
    document.getElementById('sumBreaks').innerText = breaksCount;

    const focusPercent = totalTimeSec > 0 ? (onCameraSec / totalTimeSec) : 0;
    const badgeIcon = document.getElementById('badgeIcon');
    const badgeTitle = document.getElementById('badgeTitle');
    const badgeDesc = document.getElementById('badgeDesc');

    if (totalTimeSec < 60) {
        badgeIcon.innerText = "⏱️";
        badgeTitle.innerText = "Too Short";
        badgeTitle.className = "text-2xl font-black text-navy uppercase tracking-widest";
        badgeDesc.innerText = "Session was less than 1 minute.";
    } else if (focusPercent >= 0.90 && breaksCount <= 2) {
        badgeIcon.innerText = "💎";
        badgeTitle.innerText = "Diamond Focus";
        badgeTitle.className = "text-2xl font-black text-brand-blue uppercase tracking-widest";
        badgeDesc.innerText = "Incredible concentration. Deep state achieved.";
    } else if (focusPercent >= 0.75) {
        badgeIcon.innerText = "🥇";
        badgeTitle.innerText = "Gold Scholar";
        badgeTitle.className = "text-2xl font-black text-brand-green uppercase tracking-widest";
        badgeDesc.innerText = "Solid work session with minimal disruptions.";
    } else if (focusPercent >= 0.50) {
        badgeIcon.innerText = "🥈";
        badgeTitle.innerText = "Silver Thinker";
        badgeTitle.className = "text-2xl font-black text-navy uppercase tracking-widest";
        badgeDesc.innerText = "Good effort, but try to reduce away-time.";
    } else {
        badgeIcon.innerText = "☁️";
        badgeTitle.innerText = "Wandering Mind";
        badgeTitle.className = "text-2xl font-black text-brand-amber uppercase tracking-widest";
        badgeDesc.innerText = "Highly distracted session. Time to regroup.";
    }

    document.getElementById('summaryModal').classList.remove('hidden');
}

function closeSummary() {
    document.getElementById('summaryModal').classList.add('hidden');
}

// FEATURE UPGRADE: Downloadable text reports instead of a simple copy-paste
function generateAIReport() {
    let completedTasks = tasks.filter(t => t.completed).length;
    let currentWeekHabits = 0; let lastWeekHabits = 0;
    
    habits.forEach(h => {
        currentWeekHabits += h.days.filter(Boolean).length;
        lastWeekHabits += (h.lastWeekCount || 0);
    });
    
    let trendStr = "";
    if (lastWeekHabits > 0) {
        const percentChange = Math.round(((currentWeekHabits - lastWeekHabits) / lastWeekHabits) * 100);
        trendStr = percentChange >= 0 ? `(+${percentChange}% vs last week 📈)` : `(${percentChange}% vs last week 📉)`;
    } else if (lastWeekHabits === 0 && currentWeekHabits > 0) {
        trendStr = `(+100% vs last week 📈)`;
    }

    let insight = "";
    if (completedTasks > 5 && currentWeekHabits > lastWeekHabits) insight = "Absolutely locked in. Dominating objectives and outworking the competition. ⚡";
    else if (currentWeekHabits > 10) insight = "Relentless consistency. The daily systems are paying off massively. 🧱";
    else if (completedTasks >= 1) insight = "Making steady, calculated progress. Every objective secured counts. 🎯";
    else if (currentWeekHabits === 0 && completedTasks === 0) insight = "System resting. Ready to attack the next deep work session. 🔋";
    else insight = "Maintaining the baseline. Focusing on ruthless execution. 🧠";

    const report = `🔥 LockIn | Execution Report\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n🎯 Objectives Secured: ${completedTasks}\n✅ Habits Maintained: ${currentWeekHabits} ${trendStr}\n⚡ AI Insight: ${insight}\n\nOutwork everyone.\n#LockedIn #DeepWork`;

    document.getElementById('reportText').value = report;
    document.getElementById('reportModal').classList.remove('hidden');
    
    // Convert the 'Copy' button into a true 'Download' button dynamically
    const actionBtn = document.getElementById('copyBtn');
    actionBtn.innerHTML = '<i class="ph ph-download-simple"></i> Download Report';
    
    // Override the HTML onclick method
    actionBtn.onclick = function() {
        const textToSave = document.getElementById('reportText').value;
        const blob = new Blob([textToSave], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        
        // Create an invisible download link and trigger it
        const a = document.createElement('a');
        a.href = url;
        const dateStr = new Date().toISOString().split('T')[0];
        a.download = `LockIn_Report_${dateStr}.txt`;
        
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        // Visual confirmation
        this.innerHTML = '<i class="ph ph-check"></i> Downloaded!';
        setTimeout(() => {
            this.innerHTML = '<i class="ph ph-download-simple"></i> Download Report';
        }, 2000);
    };
}

// Fallback kept just in case, but generateAIReport overrides it dynamically anyway
function copyReport() {
    const text = document.getElementById('reportText');
    text.select();
    document.execCommand('copy');
    document.getElementById('copyBtn').innerHTML = '<i class="ph ph-check"></i> Copied to Clipboard!';
}

function closeReport() {
    document.getElementById('reportModal').classList.add('hidden');
}

renderHabits(); renderTasks(); setTimeout(resizeHabitsGraph, 100);
