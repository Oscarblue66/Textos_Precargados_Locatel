// 1. CONFIGURACIÓN DE TU GOOGLE SHEETS
const SHEET_ID = '1x7iucwchPYusc81R09oP-87E4tii0JTP8Fyhkvz_GvQ'; 

// IMPORTANTE: Debes colocar el 'gid' exacto de cada hoja. 
// Lo encuentras en la URL de tu Google Sheets cuando cambias de pestaña (al final dice #gid=XXXXX)
const PESTANAS = [
    { id: 'saludos', nombre: 'SALUDOS', gid: '0' },
    { id: 'f', nombre: 'F', gid: '2042615712' }, 
    { id: 'llave', nombre: 'Llave', gid: '288101088' }, // CAMBIAR ESTE GID
    { id: 'lytc', nombre: 'L y TC', gid: '815997596' }, // CAMBIAR ESTE GID
    { id: 'peinfr', nombre: 'P e Infr', gid: '706698375' }, // CAMBIAR ESTE GID
    { id: 'hnc', nombre: 'HNC', gid: '217925413' }, // CAMBIAR ESTE GID
    { id: 'becas', nombre: 'Becas y AS', gid: '756532134' }, // CAMBIAR ESTE GID
    { id: 'ayb', nombre: 'A y B', gid: '1346245991' }, // CAMBIAR ESTE GID
    { id: 'actcurp', nombre: 'Act y CURP', gid: '2080085996' }, // CAMBIAR ESTE GID
    { id: 'cons', nombre: 'Cons y cert', gid: '1274962924' }, // CAMBIAR ESTE GID
    { id: 'tramites', nombre: 'Tramites', gid: '1352914172' }, // CAMBIAR ESTE GID
    { id: 'rsuac', nombre: 'R SUAC', gid: '2031799909' }, // CAMBIAR ESTE GID
    { id: 'info1', nombre: 'Info', gid: '429062519' }, // CAMBIAR ESTE GID
    { id: 'alcyedos', nombre: 'Alc y edos', gid: '388678595' }, // CAMBIAR ESTE GID
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

// 3. CAMBIAR DE PESTAÑA Y CARGAR DATOS
async function cambiarPestana(id, gid) {
    // Estilos del botón activo
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(`btn-${id}`).classList.add('active');
    
    tabActiva = id;
    searchInput.value = ''; // Limpiar el buscador al cambiar de pestaña

    // Si ya descargamos esta hoja antes, mostramos desde la memoria (caché)
    if (cacheDatos[id]) {
        renderizarTabla(cacheDatos[id]);
        return;
    }

    // Si es la primera vez, mostramos "Cargando" y descargamos
    tableBody.innerHTML = `<tr><td colspan="6" class="loading"><div class="loader"></div>Cargando datos de "${id}"...</td></tr>`;

   try {
        const query = encodeURIComponent("SELECT A, B, C, D, E");
        // TRUCO ANTI-CACHÉ: Le agregamos la hora actual para obligar a Google a leer el archivo fresco
        const tiempoReal = new Date().getTime(); 
        const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&range=A1:E1000&tq=${query}&gid=${gid}&cb=${tiempoReal}`;
        
        const respuesta = await fetch(URL);
        const texto = await respuesta.text();
        
        const jsonString = texto.substring(47, texto.length - 2);
        const json = JSON.parse(jsonString);

        console.log(`=== DATOS FRESCOS DE: ${id} ===`, json.table.rows.length, "filas leídas");

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

        // Limpieza de encabezados y filas vacías
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
        tableBody.innerHTML = `<tr><td colspan="6" style="color:red; text-align:center;">Error al cargar la pestaña.</td></tr>`;
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
        
        // TRUCO AQUÍ: Si Google Sheets envía los símbolos < y > como texto, los forzamos a ser HTML
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

// 5. LÓGICA DEL BUSCADOR - VERSIÓN AVANZADA (MÚLTIPLES PALABRAS)
searchInput.addEventListener('input', function(e) {
    const terminoBusqueda = e.target.value.toLowerCase().trim();
    const datosDePestana = cacheDatos[tabActiva] || [];

    clearBtn.style.display = terminoBusqueda.length > 0 ? 'block' : 'none';

    if (terminoBusqueda === '') {
        renderizarTabla(datosDePestana);
        return;
    }

    // Dividir la búsqueda en palabras individuales
    const palabrasBusqueda = terminoBusqueda.split(/\s+/);

    const datosFiltrados = datosDePestana.filter(item => {
        const camposConcatenados = [
            item.tema,
            item.subtema,
            item.categoria,
            item.texto,
            item.hashtag
        ].map(campo => String(campo || '').toLowerCase()).join(' ');

        // Todas las palabras deben estar presentes en al menos uno de los campos
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
    evento.stopPropagation(); // Evita que se dispare el evento de la fila
    await ejecutarCopiado(boton);
}

// 7. MOTOR DE COPIADO (INTEGRADO CON LÓGICA PARA IMÁGENES)
async function ejecutarCopiado(boton) {
    try {
        const textoExtraido = decodeURIComponent(boton.getAttribute('data-texto'));
        
        // Verificamos si contiene una etiqueta de imagen
        const contieneImagen = textoExtraido.includes('<img');

        if (contieneImagen) {
            // Creamos un Blob de tipo HTML para que las aplicaciones 
            // reconozcan tanto el texto como la imagen.
            const type = "text/html";
            const blob = new Blob([textoExtraido], { type });
            const data = [new ClipboardItem({ 
                [type]: blob, 
                "text/plain": new Blob([textoExtraido], {type: "text/plain"}) 
            })];
            
            await navigator.clipboard.write(data);
        } else {
            // Si es texto normal, copiamos como siempre
            await navigator.clipboard.writeText(textoExtraido);
        }
        
        // Efecto visual en el botón
        const textoOriginal = boton.innerText;
        boton.innerText = "¡Copiado!";
        boton.classList.add('copied');
        
        setTimeout(() => {
            boton.innerText = "Copiar";
            boton.classList.remove('copied');
        }, 1500);
        
    } catch (err) {
        console.error('Error al copiar: ', err);
        // Plan B: Copiar como texto plano si falla lo anterior
        const textoExtraido = decodeURIComponent(boton.getAttribute('data-texto'));
        await navigator.clipboard.writeText(textoExtraido);
    }
}

// FUNCIÓN PARA LIMPIAR (CORREGIDA)
clearBtn.addEventListener('click', () => {
    searchInput.value = '';
    clearBtn.style.display = 'none';
    
    // Usamos los datos guardados de la pestaña actual
    const datosOriginales = cacheDatos[tabActiva] || [];
    renderizarTabla(datosOriginales); 
    
    searchInput.focus();
});


// ==========================================================
// 11. LÓGICA DEL MENÚ LATERAL Y CONTEO DE DESPEDIDAS
// ==========================================================

const API_CONTEO_URL = 'https://script.google.com/macros/s/AKfycbw91erPVCK4AHyXZDxJrwnSXFaiVl5HPbq9MkjHAJ75snyIyAGeZY4JY2DCNq39CegBQg/exec';

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
// LÓGICA DEL TEMPORIZADOR (CONECTADO A SHEETS)
// ==========================================================
let timerInterval;
let totalSeconds = 25 * 60; 
let isTimerRunning = false;

const inputTimer = document.getElementById('inputTimer');
const timerDisplay = document.getElementById('timerDisplay');
const btnPlayTimer = document.getElementById('btnPlayTimer');
const btnPauseTimer = document.getElementById('btnPauseTimer');
const btnResetTimer = document.getElementById('btnResetTimer');

// Formatea los segundos a MM:SS
function formatTime(seconds) {
    const isNegative = seconds < 0;
    const absSecs = Math.abs(seconds);
    const m = Math.floor(absSecs / 60).toString().padStart(2, '0');
    const s = (absSecs % 60).toString().padStart(2, '0');
    return (isNegative ? "-" : "") + `${m}:${s}`;
}

// Actualiza vista
function actualizarVista() {
    timerDisplay.innerText = formatTime(totalSeconds);
    timerDisplay.style.color = totalSeconds < 0 ? "#ef4444" : "var(--primary-color)";
}

// Función principal: Leer datos desde Sheets al entrar a la página
async function sincronizarTemporizadorDesdeSheets() {
    try {
        timerDisplay.innerText = "Cargando...";
        const respuesta = await fetch(API_CONTEO_URL + '?action=leerTiempo', {
            method: 'GET',
            redirect: 'follow'
        });
        const datos = await respuesta.json();

        if (datos.status === "success") {
            // Actualizar el input con el Tiempo Total de la Columna A
            if (datos.tiempoTotal) {
                inputTimer.value = datos.tiempoTotal;
            }

            // Si hay un registro previo hoy, extraemos el tiempo
            if (datos.ultimoRegistro) {
                // Busca el patrón "Quedan: MM:SS" o "Quedan: -MM:SS"
                const match = datos.ultimoRegistro.match(/Quedan:\s*(-?\d+):(\d+)/);
                if (match) {
                    const signo = match[1].startsWith('-') ? -1 : 1;
                    const m = parseInt(match[1].replace('-', ''), 10);
                    const s = parseInt(match[2], 10);
                    
                    totalSeconds = signo * ((m * 60) + s);
                }
            } else {
                totalSeconds = parseInt(inputTimer.value || 25) * 60;
            }
            actualizarVista();
        }
    } catch (error) {
        console.error("Error al sincronizar el temporizador:", error);
        timerDisplay.innerText = formatTime(totalSeconds);
    }
}

// Iniciar Reloj
btnPlayTimer.addEventListener('click', () => {
    if (isTimerRunning) return;
    
    // Si la pantalla coincide con el input inicial, tomamos el valor del input
    if (timerDisplay.innerText === formatTime(inputTimer.value * 60) && totalSeconds === parseInt(inputTimer.value)*60) {
        totalSeconds = parseInt(inputTimer.value) * 60;
    }
    
    inputTimer.disabled = true; 
    isTimerRunning = true;
    
    timerInterval = setInterval(() => {
        totalSeconds--;
        actualizarVista();
    }, 1000);
});

// Pausar y Guardar
btnPauseTimer.addEventListener('click', () => {
    if (!isTimerRunning) return;
    
    clearInterval(timerInterval);
    isTimerRunning = false;
    
    const tiempoRestanteFormateado = formatTime(totalSeconds);
    const horaActual = new Date().toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const tiempoTotalEstablecido = inputTimer.value + " min";

    btnPauseTimer.innerText = "⏳";
    
    fetch(API_CONTEO_URL, {
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
    totalSeconds = parseInt(inputTimer.value) * 60;
    actualizarVista();
});

// Modificar input manual
inputTimer.addEventListener('input', () => {
    if (!isTimerRunning) {
        totalSeconds = parseInt(inputTimer.value || 0) * 60;
        actualizarVista();
    }
});

// Ejecutar sincronización al cargar la página (se puede añadir debajo de inicializarPestanas)
sincronizarTemporizadorDesdeSheets();


// 4. Cargamos todo por primera vez al entrar a la página
cargarHashtagsDesdeExcel();


// Iniciar aplicación
window.onload = inicializarPestanas;
