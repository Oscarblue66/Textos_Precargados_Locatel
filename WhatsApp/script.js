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

// Iniciar aplicación
window.onload = inicializarPestanas;
