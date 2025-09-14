// Colores arcoíris para los segmentos (puedes ajustar estos colores para que se parezcan más a la imagen)
const segmentColors = [
    '#f44336', // rojo
    '#ff9800', // naranja
    '#ffeb3b', // amarillo
    '#cddc39', // lima
    '#4caf50', // verde
    '#00bcd4', // turquesa
    '#2196f3', // azul
    '#3f51b5', // azul oscuro
    '#9c27b0', // violeta
    '#e91e63', // rosa
    '#795548', // marrón
    '#607d8b'  // gris azulado
];

// Actividades y emojis - Horario de 24 horas para un niño
// Cada actividad corresponde a 2 horas del día (12 segmentos x 2 horas = 24 horas)
const activities = [
    { emoji: '🌙', label: 'Sueño profundo', hours: [0, 1] },     // 00:00-01:59
    { emoji: '🛏️', label: 'Dormir', hours: [2, 3] },             // 02:00-03:59
    { emoji: '🛏️', label: 'Dormir', hours: [4, 5] },             // 04:00-05:59
    { emoji: '🛏️', label: 'Dormir', hours: [6, 7] },             // 06:00-07:59
    { emoji: '🌅', label: 'Despertar', hours: [8, 9] },           // 08:00-09:59
    { emoji: '🚶‍♂️', label: 'Ir al cole', hours: [10, 11] },      // 10:00-11:59
    { emoji: '📚', label: 'Clases', hours: [12, 13] },            // 12:00-13:59
    { emoji: '🍽️', label: 'Comer', hours: [14, 15] },            // 14:00-15:59
    { emoji: '⚽', label: 'Jugar', hours: [16, 17] },             // 16:00-17:59
    { emoji: '📖', label: 'Deberes', hours: [18, 19] },           // 18:00-19:59
    { emoji: '🍽️', label: 'Cena', hours: [20, 21] },             // 20:00-21:59
    { emoji: '🛁', label: 'Ducha', hours: [22, 23] }              // 22:00-23:59
];

// Dibuja los segmentos radiales completos (tipo tarta)
function drawSegments() {
    const svg = document.getElementById('segments');
    svg.innerHTML = '';
    // Obtener el tamaño actual del reloj
    const clockStack = document.querySelector('.clock-stack');
    const size = Math.min(clockStack.offsetWidth, clockStack.offsetHeight);
    const cx = size / 2, cy = size / 2, r = (size * 0.46); // pastel más pequeño, margen
    for (let i = 0; i < 12; i++) {
        const startAngle = (i - 3) * 30 * Math.PI / 180;
        const endAngle = (i - 2) * 30 * Math.PI / 180;
        const x1 = cx + r * Math.cos(startAngle);
        const y1 = cy + r * Math.sin(startAngle);
        const x2 = cx + r * Math.cos(endAngle);
        const y2 = cy + r * Math.sin(endAngle);
        const path = `M${cx},${cy} L${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2} Z`;
        const seg = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        seg.setAttribute('d', path);
        seg.setAttribute('fill', segmentColors[i]);
        svg.appendChild(seg);
    }
}

drawSegments();

// Dibuja los números grandes (1-12) y pequeños (13-24)
function drawNumbers() {
    const numbersDiv = document.querySelector('.numbers');
    numbersDiv.innerHTML = '';
    // Obtener el tamaño actual del reloj
    const clockStack = document.querySelector('.clock-stack');
    const size = Math.min(clockStack.offsetWidth, clockStack.offsetHeight);
    const cx = size / 2, cy = size / 2, rBig = size * 0.35, rSmall = size * 0.28;
    for (let i = 1; i <= 12; i++) {
        const angle = (i - 3) * 30 * Math.PI / 180;
        const x = cx + rBig * Math.cos(angle);
        const y = cy + rBig * Math.sin(angle);
        const num = document.createElement('div');
        num.className = 'number';
        const offset = size * 0.05;
        num.style.left = `${x - offset}px`;
        num.style.top = `${y - offset}px`;
        num.textContent = i;
        numbersDiv.appendChild(num);
        // Números pequeños (13-24)
        const smallAngle = angle;
        const xSmall = cx + rSmall * Math.cos(smallAngle);
        const ySmall = cy + rSmall * Math.sin(smallAngle);
        const numSmall = document.createElement('div');
        numSmall.className = 'number number-small';
        const smallOffset = size * 0.03;
        numSmall.style.left = `${xSmall - smallOffset}px`;
        numSmall.style.top = `${ySmall - smallOffset}px`;
        numSmall.textContent = i + 12;
        numbersDiv.appendChild(numSmall);
    }
}
drawNumbers();

// Dibuja los iconos de actividades alrededor del reloj
function drawActivityImages() {
    const imgsDiv = document.querySelector('.activity-images');
    imgsDiv.innerHTML = '';
    // Obtener el tamaño actual del reloj
    const clockStack = document.querySelector('.clock-stack');
    const size = Math.min(clockStack.offsetWidth, clockStack.offsetHeight);
    const cx = size / 2, cy = size / 2, r = size * 0.58; // fuera del pastel pero dentro del canvas
    for (let i = 0; i < 12; i++) {
        const angle = (i - 3) * 30 * Math.PI / 180;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        const img = document.createElement('div');
        img.className = 'activity-img';
        const imgOffset = size * 0.07;
        img.style.left = `${x - imgOffset}px`;
        img.style.top = `${y - imgOffset}px`;
        img.title = activities[i].label;
        img.textContent = activities[i].emoji;
        imgsDiv.appendChild(img);
    }
}
drawActivityImages();

// Manecillas y fecha (igual que antes)
function updateClock() {
    // Obtener la hora local del navegador
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Calcular ángulos correctamente, restando 90 grados para alinear el 12 arriba
    const hourDegrees = ((hours % 12) * 30) + (minutes * 0.5) - 90;
    const minuteDegrees = (minutes * 6) + (seconds * 0.1) - 90;
    const secondDegrees = (seconds * 6) - 90;

    // Actualizar manecillas
    document.querySelector('.hour-hand').style.transform = `rotate(${hourDegrees}deg)`;
    document.querySelector('.minute-hand').style.transform = `rotate(${minuteDegrees}deg)`;
    document.querySelector('.second-hand').style.transform = `rotate(${secondDegrees}deg)`;

    // Hora digital local
    const digital = document.getElementById('digital-time');
    digital.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Fecha local
    const dateOptions = { weekday: 'long', day: 'numeric', month: 'long' };
    document.getElementById('date').textContent = now.toLocaleDateString('es-ES', dateOptions);

    // Actividad actual
    updateActivities(hours);
}

function updateActivities(hours) {
    // Encontrar la actividad correspondiente a la hora actual (0-23)
    let currentActivityIndex = -1;
    for (let i = 0; i < activities.length; i++) {
        if (activities[i].hours.includes(hours)) {
            currentActivityIndex = i;
            break;
        }
    }
    
    // Si no se encuentra una actividad específica, usar la más cercana
    if (currentActivityIndex === -1) {
        currentActivityIndex = Math.floor(hours / 2) % 12;
    }
    
    // Quitar highlight a todas
    document.querySelectorAll('.activity-img').forEach(e => e.classList.remove('active'));
    // Poner highlight a la actual
    document.querySelectorAll('.activity-img')[currentActivityIndex].classList.add('active');
    
    // Mostrar actividad actual y próxima
    const current = activities[currentActivityIndex];
    const next = activities[(currentActivityIndex + 1) % 12];
    
    // Mostrar AM/PM en la actividad
    const period = hours < 12 ? 'AM' : 'PM';
    const displayHour = hours === 0 ? 12 : (hours > 12 ? hours - 12 : hours);
    
    document.getElementById('current-activity').querySelector('p').textContent = 
        `${current.emoji} ${current.label} (${displayHour}:00 ${period})`;
    document.getElementById('next-activity').querySelector('p').textContent = 
        `${next.emoji} ${next.label}`;
}

setInterval(updateClock, 1000);
updateClock();

// Redibujar elementos cuando cambie el tamaño de la ventana
window.addEventListener('resize', () => {
    drawSegments();
    drawNumbers();
    drawActivityImages();
});

// --- SETTINGS MENU LOGIC ---
const settingsBtn = document.getElementById('settings-btn');
const modalBg = document.getElementById('modal-bg');
const closeSettings = document.getElementById('close-settings');
const settingsForm = document.getElementById('settings-form');
const settingsList = document.getElementById('settings-list');

function openSettings() {
    // Rellenar el listado de inputs
    settingsList.innerHTML = '';
    for (let i = 0; i < 12; i++) {
        const startHour = activities[i].hours[0];
        const endHour = activities[i].hours[1];
        const timeRange = `${startHour.toString().padStart(2, '0')}:00-${(endHour + 1).toString().padStart(2, '0')}:00`;
        
        const row = document.createElement('div');
        row.className = 'settings-row';
        row.innerHTML = `
            <label>${timeRange}</label>
            <input type="text" maxlength="2" class="activity-emoji" value="${activities[i].emoji}" title="Emoji" />
            <input type="text" class="activity-label" value="${activities[i].label}" title="Nombre de la actividad" />
        `;
        settingsList.appendChild(row);
    }
    modalBg.classList.add('active');
}

function closeSettingsModal() {
    modalBg.classList.remove('active');
}

settingsBtn.addEventListener('click', openSettings);
closeSettings.addEventListener('click', closeSettingsModal);
modalBg.addEventListener('click', (e) => {
    if (e.target === modalBg) closeSettingsModal();
});

settingsForm.addEventListener('submit', function(e) {
    e.preventDefault();
    // Leer los valores y actualizar activities
    const emojiInputs = settingsList.querySelectorAll('.activity-emoji');
    const labelInputs = settingsList.querySelectorAll('.activity-label');
    for (let i = 0; i < 12; i++) {
        activities[i].emoji = emojiInputs[i].value || '❓';
        activities[i].label = labelInputs[i].value || 'Sin actividad';
        // Mantener las horas originales
        // activities[i].hours se mantiene igual
    }
    // Redibujar imágenes y actualizar reloj
    drawActivityImages();
    updateClock();
    closeSettingsModal();
});
