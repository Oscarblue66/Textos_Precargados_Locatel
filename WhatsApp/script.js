// 1. CONFIGURACIÓN DE TU GOOGLE SHEETS (VERSIÓN WHATSAPP)
const SHEET_ID = '1IlajVBIu5z1oj6lPVMb-hOb3NA4bvqbnhWYS4Npiu5g'; 

// IMPORTANTE: Debes colocar el 'gid' exacto de cada hoja. 
const PESTANAS = [
    { id: 'saludos', nombre: 'SALUDOS', gid: '0' },
    { id: 'f', nombre: 'F', gid: '1464481431' }, 
    { id: 'llave', nombre: 'Llave', gid: '1140623267' }, 
    { id: 'lytc', nombre: 'L y TC', gid: '840970755' }, 
    { id: 'peinfr', nombre: 'P e Infr', gid: '362228738' }, // ¡CORREGIDO AQUÍ!
    { id: 'hnc', nombre: 'HNC', gid: '1670951048' }, 
    { id: 'becas', nombre: 'Becas y AS', gid: '571680815' }, 
    { id: 'ayb', nombre: 'A y B', gid: '1794122962' }, 
    { id: 'actcurp', nombre: 'Act y CURP', gid: '1629227110' }, 
    { id: 'cons', nombre: 'Cons y cert', gid: '1296516919' }, 
    { id: 'tramites', nombre: 'Tramites', gid: '624780491' }, 
    { id: 'rsuac', nombre: 'R SUAC', gid: '179293447' }, 
    { id: 'info1', nombre: 'Info', gid: '1820801280' }, 
    { id: 'alcedos', nombre: 'Alc y edos', gid: '1813713247' } 
];

let cacheDatos = {}; // Memoria para no descargar 2 veces la misma pestaña
let tabActiva = ''; // Guarda el ID de la pestaña actual

const tableBody = document.getElementById('tableBody');
const searchInput = document.getElementById('searchInput');
const tabsContainer = document.getElementById('tabsContainer');
// botón Limpiar
const clearBtn = document.getElementById('clearSearch');

// 2. INICIALIZAR PESTAÑAS
function inicializarPestanas() {
    PESTANAS.forEach(pestana => {
        const btn = document.createElement('button');
        btn.className = 'tab-btn';
        btn.innerText = pestana.nombre;
        btn.onclick = () => cambiarPestana(pestana.id, pestana.gid);
        btn.id = `btn-${pestana.id}`;
        tabsContainer.appendChild(btn);
    });

    // Cargar la primera pestaña por defecto
    if(PESTANAS.length > 0) {
        cambiarPestana(PESTANAS[0].id, PESTANAS[0].gid);
    }
}

// 3. CAMBIAR DE PESTAÑA Y CARGAR DATOS (¡VERSIÓN BLINDADA!)
async function cambiarPestana(id, gid) {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${id}`).classList.add('active');
    
    tabActiva = id;
    searchInput.value = ''; 

    if (cacheDatos[id]) {
        renderizarTabla(cacheDatos[id]);
        return;
    }

    tableBody.innerHTML = `<tr><td colspan="6" class="loading"><div class="loader"></div>Cargando datos de "${id}"...</td></tr>`;

    try {
        const query = encodeURIComponent("SELECT A, B, C, D, E");
        // TRUCO ANTI-CACHÉ Y RANGO EXTENDIDO PARA EVITAR BUGS DE GOOGLE
        const tiempoReal = new Date().getTime(); 
        const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&range=A1:E1000&tq=${query}&gid=${gid}&cb=${tiempoReal}`;
        
        const respuesta = await fetch(URL);
        const texto = await respuesta.text();
        
        const jsonString = texto.substring(47, texto.length - 2);
        const json = JSON.parse(jsonString);

        let datosProcesados = json.table.rows.map(row => {
            let textoBruto = (row && row.c && row.c[3] && row.c[3].v !== null) ? String(row.c[3].v) : "";
            let textoLimpio = textoBruto;
            
            if (textoLimpio.startsWith('"') && textoLimpio.endsWith('"')) {
                textoLimpio = textoLimpio.substring(1, textoLimpio.length - 1);
            }
            textoLimpio = textoLimpio.replace(/""/g, '"');

            return {
                tema: (row && row.c && row.c[0] && row.c[0].v !== null) ? String(row.c[0].v) : "",
                subtema: (row && row.c && row.c[1] && row.c[1].v !== null) ? String(row.c[1].v) : "",
                categoria: (row && row.c && row.c[2] && row.c[2].v !== null) ? String(row.c[2].v) : "",
                texto: textoLimpio,
                hashtag: (row && row.c && row.c[4] && row.c[4].v !== null) ? String(row.c[4].v) : ""
            };
        });

        // Limpieza inteligente de encabezados y filas vacías
        datosProcesados = datosProcesados.filter(item => {
            const temaFiltro = String(item.tema).trim().toLowerCase();
            if (temaFiltro === "tema" || temaFiltro.startsWith("tabla_")) return false;
            if (item.tema === "" && item.subtema === "" && item.texto === "") return false;
            return true;
        });

        cacheDatos[id] = datosProcesados;
        
        if(tabActiva === id) {
            renderizarTabla(datosProcesados);
        }

    } catch (error) {
        console.error(`Error al cargar la pestaña ${id}:`, error);
        tableBody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Error al cargar la pestaña. Verifica el GID o permisos.</td></tr>`;
    }
}

// 4. FUNCIÓN PARA DIBUJAR LA TABLA
function renderizarTabla(datos) {
    tableBody.innerHTML = ''; 

    if (!datos || datos.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 30px; color: var(--text-muted);">No hay información en esta pestaña o no coincide con la búsqueda.</td></tr>`;
        return;
    }

    datos.forEach(item => {
        const tr = document.createElement('tr');
        // Renderizamos < y > correctamente
        let textoVisual = item.texto.replace(/&lt;/g, '<').replace(/&gt;/g, '>');
        const textoCodificado = encodeURIComponent(textoVisual);

        tr.setAttribute('onclick', 'copiarDesdeFila(this)');
        tr.innerHTML = `
            <td>${item.tema}</td>
            <td>${item.subtema}</td>
            <td>${item.categoria}</td>
            <td class="text-col">${textoVisual}</td>
            <td>${item.hashtag}</td>
            <td class="center-col">
                <button class="copy-btn" data-texto="${textoCodificado}" onclick="copiarAlPortapapeles(event, this)">Copiar</button>
            </td>
        `;
        tableBody.appendChild(tr);
    });
}

// 5. LÓGICA DEL BUSCADOR - VERSIÓN AVANZADA
searchInput.addEventListener('input', function(e) {
    const terminoBusqueda = e.target.value.toLowerCase().trim();
    const datosDePestana = cacheDatos[tabActiva] || [];

    clearBtn.style.display = terminoBusqueda.length > 0 ? 'block' : 'none';

    if (terminoBusqueda === '') {
        renderizarTabla(datosDePestana);
        return;
    }

    const palabrasBusqueda = terminoBusqueda.split(/\s+/);

    const datosFiltrados = datosDePestana.filter(item => {
        const camposConcatenados = [
            item.tema,
            item.subtema,
            item.categoria,
            item.texto,
            item.hashtag
        ].map(campo => String(campo || '').toLowerCase()).join(' ');

        return palabrasBusqueda.every(palabra => 
            camposConcatenados.includes(palabra)
        );
    });

    renderizarTabla(datosFiltrados);
});

// 6. FUNCIONES DE COPIADO
async function copiarDesdeFila(fila) {
    const boton = fila.querySelector('.copy-btn');
    if(boton) await ejecutarCopiado(boton);
    
    fila.style.backgroundColor = "rgba(16, 185, 129, 0.1)"; 
    setTimeout(() => { fila.style.backgroundColor = ""; }, 1500);
}

async function copiarAlPortapapeles(evento, boton) {
    evento.stopPropagation(); 
    await ejecutarCopiado(boton);
}

// 7. MOTOR DE COPIADO (MANTIENE TU VERSIÓN WHATSAPP CON DESCARGA DE IMÁGENES)
async function ejecutarCopiado(boton) {
    try {
        const textoExtraido = decodeURIComponent(boton.getAttribute('data-texto'));
        
        // Buscamos si el texto es exactamente una etiqueta HTML de imagen
        const esImagen = textoExtraido.match(/<img[^>]+src=["']([^"']+)["']/i);

        if (esImagen) {
            const urlImagen = esImagen[1];
            
            try {
                const respuesta = await fetch(urlImagen);
                const blob = await respuesta.blob();
                
                const item = new ClipboardItem({ [blob.type]: blob });
                await navigator.clipboard.write([item]);
                
            } catch (errorFetch) {
                console.warn("Bloqueo CORS al descargar la imagen. Se copiará como texto en su lugar.", errorFetch);
                await navigator.clipboard.writeText(textoExtraido);
            }
        } else {
            await navigator.clipboard.writeText(textoExtraido);
        }
        
        const textoOriginal = boton.innerText;
        boton.innerText = "¡Copiado!";
        boton.classList.add('copied');
        
        setTimeout(() => {
            boton.innerText = "Copiar"; 
            boton.classList.remove('copied');
        }, 1500);
        
    } catch (err) {
        console.error('Error al copiar: ', err);
        alert("Tu navegador bloqueó la acción. Revisa los permisos del portapapeles.");
    }
}

// 8. FUNCIÓN PARA LIMPIAR
clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    
    const datosOriginales = cacheDatos[tabActiva] || [];
    renderizarTabla(datosOriginales); 
    
    searchInput.focus();
});

// ==========================================================
// 11. LÓGICA DEL MENÚ LATERAL Y CONTEO DE DESPEDIDAS
// ==========================================================

const API_CONTEO_URL = 'https://script.google.com/macros/s/AKfycbwQfBv4sOhNZm_sRFDeobKHiWDIECy9T_mqxR40ZbvsXmVAVUd0w2hx1IGUizHzx7oEnw/exec';
const API_CONTEO_URL2 = 'https://script.google.com/macros/s/AKfycbw91erPVCK4AHyXZDxJrwnSXFaiVl5HPbq9MkjHAJ75snyIyAGeZY4JY2DCNq39CegBQg/exec';

const btnMenuDespedidas = document.getElementById('btnMenuDespedidas');
const sideMenuDespedidas = document.getElementById('sideMenuDespedidas');
const closeMenuBtn = document.getElementById('closeMenuBtn');
const searchHashtag = document.getElementById('searchHashtag');
const hashtagButtonsContainer = document.getElementById('hashtagButtonsContainer');

const textoActivo = `Por último, nos encantaría conocer su experiencia con nuestro servicio a través de una breve encuesta de satisfacción:  https://forms.gle/iXN2fQZvXikwM6HTA 📊📈\nGracias por utilizar los servicios de *0311Locatel, le atendió JOSE GRANADOS. Hasta luego. #LAPALABRADELBOTON`;

const textoInactivo = `Debido a inactividad, el chat de *0311 LOCATEL finaliza su sesión, le recordamos que también podemos brindarle información a través de redes sociales, en Facebook como Locatel Ciudad de México y en Twitter como @locatel_mx o marcando al *0311 las 24 horas del día los 365 días del año, si desea realizar un reporte sobre servicios en la CDMX puede realizarlo por medio de https://311locatel.cdmx.gob.mx/ Le atendió JOSE GRANADOS. Hasta luego. #LAPALABRADELBOTON`;

// Ahora la lista iniciará vacía y se llenará sola
let listaHashtags = []; 


// --- NUEVA FUNCIÓN: LEER LAS COLUMNAS DESDE APPS SCRIPT ---
async function cargarHashtagsDesdeExcel() {
    try {
        const respuesta = await fetch(API_CONTEO_URL + '?action=leer', {
            method: 'GET',
            redirect: 'follow'
        });
        const datos = await respuesta.json();
        
        if (datos.status === "success" && datos.hashtags) {
            listaHashtags = datos.hashtags;
            renderHashtags();
        } else {
            console.error("Error desde Apps Script:", datos.mensaje);
        }
    } catch (error) {
        console.error("Error de conexión al cargar hashtags:", error);
    }
}

// 1. Abrir y Cerrar el menú lateral
if (btnMenuDespedidas && sideMenuDespedidas) {
    btnMenuDespedidas.addEventListener('click', () => {
        sideMenuDespedidas.classList.add('open');
        // Actualiza los botones cada vez que abres el menú
        cargarHashtagsDesdeExcel(); 
    });
}
if (closeMenuBtn) {
    closeMenuBtn.addEventListener('click', () => {
        sideMenuDespedidas.classList.remove('open');
    });
}

// NUEVO: Cerrar el menú al hacer clic fuera de él
document.addEventListener('click', (e) => {
    // Verificamos si el menú existe y está abierto
    if (sideMenuDespedidas && sideMenuDespedidas.classList.contains('open')) {
        // Comprobamos que el clic NO fue dentro del menú (sideMenuDespedidas)
        // y que NO fue en el botón flotante (btnMenuDespedidas)
        if (!sideMenuDespedidas.contains(e.target) && !btnMenuDespedidas.contains(e.target)) {
            sideMenuDespedidas.classList.remove('open');
        }
    }
});

// 2. Función principal: Crear los botones y manejar el clic
function renderHashtags(filtro = "") {
    hashtagButtonsContainer.innerHTML = "";
    
    const filtrados = listaHashtags.filter(h => h.toLowerCase().includes(filtro.toLowerCase()));
    
    if(filtrados.length === 0) {
        hashtagButtonsContainer.innerHTML = `<p style="text-align:center; color: var(--text-muted); font-size:14px;">No se encontraron etiquetas.</p>`;
        return;
    }

    filtrados.forEach(hashtag => {
        const btn = document.createElement('button');
        btn.className = 'hashtag-btn';
        btn.innerHTML = `<span>${hashtag}</span> <span style="font-size: 14px; opacity: 0.7;">📋</span>`;
        
        btn.addEventListener('click', async () => {
            // Leemos el estado del switch (Activo / Inactivo)
            let estadoSeleccionado = document.querySelector('input[name="estadoDespedida"]:checked').value;
            
            // 🔥 REGLA ESTRICTA: Si es #INACTIVIDAD, ignoramos el menú y forzamos inactivo
            if (hashtag === "#INACTIVIDAD") {
                estadoSeleccionado = "inactivo";
            }

            // Seleccionamos el texto según el estado final dictado
            let textoFinal = estadoSeleccionado === "activo" ? textoActivo : textoInactivo;
            
            // Reemplazamos el comodín por el hashtag clickeado
            textoFinal = textoFinal.replace('#LAPALABRADELBOTON', hashtag);
            
            try {
                // Copiamos al portapapeles
                await navigator.clipboard.writeText(textoFinal);
                
                // Animación visual verde de copiado
                btn.classList.add('copied');
                btn.innerHTML = `<span>¡Copiado!</span> <span>✅</span>`;
                setTimeout(() => {
                    btn.classList.remove('copied');
                    btn.innerHTML = `<span>${hashtag}</span> <span style="font-size: 14px; opacity: 0.7;">📋</span>`;
                }, 1500);

                // Mandamos el hashtag y el estado al Excel de fondo
                // ... dentro de btn.addEventListener('click', async () => { ...
                fetch(API_CONTEO_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams({ 
                        'action': 'guardar',
                        'hashtag': hashtag,
                        'estado': estadoSeleccionado
                    })
                }).then(res => res.json())
                .then(data => console.log(`Respuesta de Sheets:`, data))
                .catch(e => console.error("Error al registrar en Sheets:", e));

            } catch (err) {
                console.error('Error al copiar al portapapeles:', err);
                alert("Hubo un problema al copiar el texto. Verifica los permisos.");
            }
        });
        
        hashtagButtonsContainer.appendChild(btn);
    });
}

// 3. Conectar el buscador interno del menú
if (searchHashtag) {
    searchHashtag.addEventListener('input', (e) => {
        renderHashtags(e.target.value.trim());
    });
}

// ==========================================================
// LÓGICA DEL TEMPORIZADOR (CONECTADO A SHEETS Y CON MILISEGUNDOS)
// ==========================================================
let timerInterval;
let totalMilliseconds = 25 * 60 * 1000; 
let isTimerRunning = false;
let lastTickTime = 0; // Para calcular el desfase de tiempo real

const inputTimer = document.getElementById('inputTimer');
const timerDisplay = document.getElementById('timerDisplay');
const btnPlayTimer = document.getElementById('btnPlayTimer');
const btnPauseTimer = document.getElementById('btnPauseTimer');
const btnResetTimer = document.getElementById('btnResetTimer');

// Formatea los milisegundos a MM:SS.ms (Ej. 24:50.85)
function formatTime(msTotal) {
    const isNegative = msTotal < 0;
    const absMs = Math.abs(msTotal);
    const m = Math.floor(absMs / 60000).toString().padStart(2, '0');
    const s = Math.floor((absMs % 60000) / 1000).toString().padStart(2, '0');
    // Usamos 2 dígitos para los milisegundos (centisegundos) para mayor fluidez visual
    const ms = Math.floor((absMs % 1000) / 10).toString().padStart(2, '0'); 
    
    return (isNegative ? "-" : "") + `${m}:${s}.${ms}`;
}

// Actualiza vista
function actualizarVista() {
    timerDisplay.innerText = formatTime(totalMilliseconds);
    timerDisplay.style.color = totalMilliseconds < 0 ? "#ef4444" : "var(--primary-color)";
}

// Función principal: Leer datos desde Sheets al entrar a la página
async function sincronizarTemporizadorDesdeSheets() {
    try {
        timerDisplay.innerText = "Cargando...";
        const respuesta = await fetch(API_CONTEO_URL2 + '?action=leerTiempo', {
            method: 'GET',
            redirect: 'follow'
        });
        const datos = await respuesta.json();

        if (datos.status === "success") {
            if (datos.tiempoTotal) {
                inputTimer.value = datos.tiempoTotal;
            }

            if (datos.ultimoRegistro) {
                // Modificado para capturar el punto y los milisegundos (Ej. Quedan: 24:50.85)
                const match = datos.ultimoRegistro.match(/Quedan:\s*(-?\d+):(\d+)(?:\.(\d+))?/);
                if (match) {
                    const signo = match[1].startsWith('-') ? -1 : 1;
                    const m = parseInt(match[1].replace('-', ''), 10);
                    const s = parseInt(match[2], 10);
                    // Si el registro viejo no tenía milisegundos, asume 00
                    const msVisuales = match[3] ? match[3].padEnd(2, '0').substring(0, 2) : "00"; 
                    const ms = parseInt(msVisuales, 10) * 10; 
                    
                    totalMilliseconds = signo * ((m * 60000) + (s * 1000) + ms);
                }
            } else {
                totalMilliseconds = parseInt(inputTimer.value || 25) * 60000;
            }
            actualizarVista();
        }
    } catch (error) {
        console.error("Error al sincronizar el temporizador:", error);
        timerDisplay.innerText = formatTime(totalMilliseconds);
    }
}

// Iniciar Reloj
btnPlayTimer.addEventListener('click', () => {
    if (isTimerRunning) return;
    
    if (timerDisplay.innerText === formatTime(inputTimer.value * 60000) && totalMilliseconds === parseInt(inputTimer.value) * 60000) {
        totalMilliseconds = parseInt(inputTimer.value) * 60000;
    }
    
    inputTimer.disabled = true; 
    isTimerRunning = true;
    lastTickTime = Date.now(); // Guardamos el momento exacto de inicio
    
    // El intervalo corre muy rápido (cada 10ms) para animar los milisegundos
    timerInterval = setInterval(() => {
        const now = Date.now();
        const delta = now - lastTickTime; // Diferencia real de tiempo
        totalMilliseconds -= delta;
        lastTickTime = now;
        
        actualizarVista();
    }, 10);
});

// Pausar y Guardar
btnPauseTimer.addEventListener('click', () => {
    if (!isTimerRunning) return;
    
    clearInterval(timerInterval);
    isTimerRunning = false;
    
    const tiempoRestanteFormateado = formatTime(totalMilliseconds);
    const horaActual = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tiempoTotalEstablecido = inputTimer.value + " min";

    btnPauseTimer.innerText = "⏳";
    
    fetch(API_CONTEO_URL2, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ 
            'action': 'guardarTiempo',
            'tiempoTotal': tiempoTotalEstablecido,
            'tiempoRestante': tiempoRestanteFormateado,
            'horaActual': horaActual
        })
    }).then(res => res.json())
      .then(data => {
          btnPauseTimer.innerText = "⏸";
          if(data.status !== "success") alert("Error backend al guardar tiempo");
      }).catch(e => {
          console.error(e);
          btnPauseTimer.innerText = "⏸";
      });
});

// Reiniciar
btnResetTimer.addEventListener('click', () => {
    clearInterval(timerInterval);
    isTimerRunning = false;
    inputTimer.disabled = false;
    totalMilliseconds = parseInt(inputTimer.value) * 60000;
    actualizarVista();
});

// Modificar input manual
inputTimer.addEventListener('input', () => {
    if (!isTimerRunning) {
        totalMilliseconds = parseInt(inputTimer.value || 0) * 60000;
        actualizarVista();
    }
});


// Ejecutar sincronización al cargar la página (se puede añadir debajo de inicializarPestanas)
sincronizarTemporizadorDesdeSheets();

// 4. Cargamos todo por primera vez al entrar a la página
cargarHashtagsDesdeExcel();


// Iniciar aplicación
window.onload = inicializarPestanas;
