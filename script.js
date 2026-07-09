// 1. CONFIGURACIÓN DE TU GOOGLE SHEETS
const SHEET_ID = '1x7iucwchPYusc81R09oP-87E4tii0JTP8Fyhkvz_GvQ'; 

// IMPORTANTE: Debes colocar el 'gid' exacto de cada hoja. 
// Lo encuentras en la URL de tu Google Sheets cuando cambias de pestaña (al final dice #gid=XXXXX)
const PESTANAS = [
    { id: 'saludos', nombre: 'SALUDOS', gid: '0' },
    { id: 'f', nombre: 'F', gid: '2042615712' }, 
    { id: 'llave', nombre: 'Llave', gid: '815191000' }, // CAMBIAR ESTE GID
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
        // ¡EL TRUCO ESTÁ AQUÍ! Añadimos &range=A:E para forzar la lectura de toda la columna
        const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&range=A:E&tq=${query}&gid=${gid}`;
        
        const respuesta = await fetch(URL);
        const texto = await respuesta.text();
        
        const jsonString = texto.substring(47, texto.length - 2);
        const json = JSON.parse(jsonString);

        console.log(`=== DATOS RECUPERADOS: ${id} ===`, json.table.rows.length, "filas");

        let datosProcesados = json.table.rows.map(row => {
            // Protegemos la lectura por si llegan celdas vacías (null)
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

        // Limpieza: quitamos encabezados y las cientos de filas vacías que Google nos mandará ahora
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

// Iniciar aplicación
window.onload = inicializarPestanas;
