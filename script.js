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

// Actividades y emojis (puedes cambiar los emojis por imágenes SVG/PNG si lo deseas)
const activities = [
    { emoji: '🎨', label: 'Pintar' },
    { emoji: '🍽️', label: 'Desayuno' },
    { emoji: '🚶‍♂️', label: 'Ir al cole' },
    { emoji: '📚', label: 'Estudiar' },
    { emoji: '🍽️', label: 'Comida' },
    { emoji: '⚽', label: 'Jugar' },
    { emoji: '🚲', label: 'Bici' },
    { emoji: '🛁', label: 'Baño' },
    { emoji: '🍽️', label: 'Cena' },
    { emoji: '📺', label: 'TV' },
    { emoji: '🛏️', label: 'Dormir' },
    { emoji: '🎵', label: 'Música' }
];

// Dibuja los segmentos radiales completos (tipo tarta)
function drawSegments() {
    const svg = document.getElementById('segments');
    svg.innerHTML = '';
    const cx = 170, cy = 170, r = 155; // pastel más pequeño, margen
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
    const cx = 170, cy = 170, rBig = 120, rSmall = 95;
    for (let i = 1; i <= 12; i++) {
        const angle = (i - 3) * 30 * Math.PI / 180;
        const x = cx + rBig * Math.cos(angle);
        const y = cy + rBig * Math.sin(angle);
        const num = document.createElement('div');
        num.className = 'number';
        num.style.left = `${x - 18}px`;
        num.style.top = `${y - 18}px`;
        num.textContent = i;
        numbersDiv.appendChild(num);
        // Números pequeños (13-24)
        const smallAngle = angle;
        const xSmall = cx + rSmall * Math.cos(smallAngle);
        const ySmall = cy + rSmall * Math.sin(smallAngle);
        const numSmall = document.createElement('div');
        numSmall.className = 'number number-small';
        numSmall.style.left = `${xSmall - 10}px`;
        numSmall.style.top = `${ySmall - 10}px`;
        numSmall.textContent = i + 12;
        numbersDiv.appendChild(numSmall);
    }
}
drawNumbers();

// Dibuja los iconos de actividades alrededor del reloj
function drawActivityImages() {
    const imgsDiv = document.querySelector('.activity-images');
    imgsDiv.innerHTML = '';
    const cx = 170, cy = 170, r = 200; // fuera del pastel pero dentro del canvas
    for (let i = 0; i < 12; i++) {
        const angle = (i - 3) * 30 * Math.PI / 180;
        const x = cx + r * Math.cos(angle);
        const y = cy + r * Math.sin(angle);
        const img = document.createElement('div');
        img.className = 'activity-img';
        img.style.left = `${x - 24}px`;
        img.style.top = `${y - 24}px`;
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
    let idx = hours % 12;
    // Quitar highlight a todas
    document.querySelectorAll('.activity-img').forEach(e => e.classList.remove('active'));
    // Poner highlight a la actual
    document.querySelectorAll('.activity-img')[idx].classList.add('active');
    // Mostrar actividad actual y próxima
    const current = activities[idx];
    const next = activities[(idx + 1) % 12];
    document.getElementById('current-activity').querySelector('p').textContent = `${current.emoji} ${current.label}`;
    document.getElementById('next-activity').querySelector('p').textContent = `${next.emoji} ${next.label}`;
}

setInterval(updateClock, 1000);
updateClock();

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
        const row = document.createElement('div');
        row.className = 'settings-row';
        row.innerHTML = `
            <label>${i + 1}</label>
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
    }
    // Redibujar imágenes y actualizar reloj
    drawActivityImages();
    updateClock();
    closeSettingsModal();
});
