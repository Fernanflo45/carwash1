// Asegúrate de que estas variables globales estén definidas por el entorno de Canvas.
// Si se ejecuta fuera de Canvas, es posible que necesites definirlas manualmente para pruebas.
// Estas variables son proporcionadas por el entorno de Canvas para la configuración de Firebase y la autenticación.
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-carwash-app-id';
const firebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : {
    // Tus credenciales de Firebase proporcionadas como respaldo si __firebase_config no está definido
    apiKey: "AIzaSyAYpuXAgcKmXHfK5Gofr7fTAYbhneHP0EY",
    authDomain: "carwash-c8f16.firebaseapp.com",
    projectId: "carwash-c8f16",
    storageBucket: "carwash-c8f16.firebasestorage.app",
    messagingSenderId: "663277593007",
    appId: "1:663277593007:web:29894669ae2300593c4f5a",
    measurementId: "G-T3JDPPEHVR"
};
const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

// Importaciones del SDK modular de Firebase.
// Estas líneas deben estar presentes en tu archivo JavaScript
// cuando uses el SDK modular de Firebase.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, collection, addDoc, getDocs, query, where, doc, getDoc, setDoc, runTransaction } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// Inicializa la aplicación de Firebase con la configuración proporcionada.
const app = initializeApp(firebaseConfig);
// Obtiene una referencia al servicio de base de datos de Firestore.
const db = getFirestore(app);
// Obtiene una referencia al servicio de autenticación.
const auth = getAuth(app);

let userId = null; // Variable para almacenar el ID del usuario actual después de la autenticación.

/**
 * Autentica al usuario. Intenta iniciar sesión con un token personalizado si lo proporciona el entorno,
 * de lo contrario, inicia sesión de forma anónima.
 */
async function authenticateUser() {
    try {
        if (initialAuthToken) {
            await signInWithCustomToken(auth, initialAuthToken);
            console.log("Sesión iniciada con token personalizado.");
        } else {
            await signInAnonymously(auth);
            console.log("Sesión iniciada de forma anónima.");
        }
    } catch (error) {
        console.error("Error de autenticación de Firebase:", error);
        showToast("❌ Error de autenticación."); // Mensaje de error de autenticación.
    }
}

// Escucha los cambios en el estado de autenticación. Esto asegura que el userId se actualice
// cada vez que el estado de autenticación del usuario cambie (por ejemplo, después del inicio de sesión inicial).
onAuthStateChanged(auth, (user) => {
    if (user) {
        userId = user.uid; // Establece el userId al UID del usuario autenticado.
        console.log("ID de usuario:", userId);
        // Las operaciones de Firestore se activan mediante clics en botones, por lo que no se necesita ninguna acción inmediata aquí.
    } else {
        userId = null; // Borra el userId si no hay ningún usuario con sesión iniciada.
        console.log("No hay ningún usuario con sesión iniciada.");
    }
});

// Llama a la función de autenticación cuando el DOM esté completamente cargado.
// Esto asegura que Firebase se inicialice y el usuario se autentique antes de
// intentar cualquier operación de Firestore.
document.addEventListener('DOMContentLoaded', authenticateUser);

/**
 * Alterna la visibilidad de diferentes secciones en la aplicación (por ejemplo, "Insertar Cliente" o "Buscar Cliente").
 * @param {string} id - El ID de la sección que se va a mostrar.
 */
function showSection(id) {
    // Primero oculta todas las secciones.
    document.querySelectorAll('.seccion').forEach(sec => sec.classList.add('hidden'));
    // Muestra la sección seleccionada.
    document.getElementById(id).classList.remove('hidden');
    // Borra los resultados de búsqueda y el criterio al cambiar a la sección 'insertar'.
    if (id === 'insertar') {
        document.getElementById('resultado').innerHTML = '';
        document.getElementById('criterio').value = '';
    }
}

/**
 * Inserta un nuevo registro de cliente en la base de datos de Firestore.
 * Recupera datos de los campos de entrada, realiza una validación básica,
 * y verifica que la placa y el número de carro no estén duplicados antes de agregar el documento.
 */
async function insertarCliente() {
    const nombre = document.getElementById('nombre').value.trim();
    const telefono = document.getElementById('telefono').value.trim();
    const placa = document.getElementById('placa').value.trim();
    // Obtiene el número de carro del nuevo campo de entrada
    const carNumber = document.getElementById('carNumber').value.trim();

    // Validación básica del lado del cliente para asegurar que todos los campos estén llenos.
    if (!nombre || !telefono || !placa || !carNumber) {
        showToast('Por favor llena todos los campos, incluyendo el número de carro.'); // Mensaje para campos incompletos.
        return;
    }

    // Asegura que el número de carro sea un número válido
    if (isNaN(carNumber) || parseInt(carNumber) <= 0) {
        showToast('El número de carro debe ser un número positivo.');
        return;
    }

    // Asegura que el usuario esté autenticado antes de intentar escribir en Firestore.
    if (!userId) {
        showToast('❌ Error: Usuario no autenticado. Intenta recargar la página.'); // Mensaje de usuario no autenticado.
        console.error('Operación de Firestore intentada sin usuario autenticado.');
        return;
    }

    try {
        const clientesCol = collection(db, 'clientes');

        // --- Verificación de duplicados ---
        // Consulta para verificar si la placa ya existe
        const qPlaca = query(clientesCol, where('placa', '==', placa));
        const placaSnapshot = await getDocs(qPlaca);

        if (!placaSnapshot.empty) {
            showToast('❌ Error: Ya existe un cliente con esa placa.');
            return;
        }

        // Consulta para verificar si el número de carro ya existe
        const qCarNumber = query(clientesCol, where('carNumber', '==', parseInt(carNumber)));
        const carNumberSnapshot = await getDocs(qCarNumber);

        if (!carNumberSnapshot.empty) {
            showToast('❌ Error: Ya existe un cliente con ese número de carro.');
            return;
        }
        // --- Fin de verificación de duplicados ---

        // Si no hay duplicados, guarda el nuevo cliente.
        await addDoc(clientesCol, {
            nombre: nombre,
            telefono: telefono,
            placa: placa,
            carNumber: parseInt(carNumber), // Guarda el número de carro como un número entero
            createdAt: new Date(), // Marca de tiempo de creación.
            createdBy: userId // ID del usuario que creó el registro.
        });

        // Borra los campos de entrada después de una inserción de datos exitosa.
        document.getElementById('nombre').value = '';
        document.getElementById('telefono').value = '';
        document.getElementById('placa').value = '';
        document.getElementById('carNumber').value = ''; // Borra también el campo de número de carro
        showToast(`✅ Cliente agregado correctamente. Número de Carro: ${carNumber}`); // Muestra el mensaje de éxito con el número de carro.

    } catch (error) {
        console.error('Error al guardar cliente:', error);
        showToast("❌ Error al guardar cliente"); // Muestra el mensaje de error.
    }
}

/**
 * Busca registros de clientes en la base de datos de Firestore basándose en un criterio dado (nombre o número de placa).
 * Recupera todos los clientes y luego los filtra en el lado del cliente.
 */
async function buscarCliente() {
    const criterio = document.getElementById('criterio').value.trim().toLowerCase();
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.innerHTML = "🔍 Buscando..."; // Muestra un mensaje de carga.

    // Si no se introduce ningún criterio de búsqueda, se le pide al usuario.
    if (!criterio) {
        resultadoDiv.innerHTML = '<p>Por favor ingresa un criterio de búsqueda.</p>';
        return;
    }

    // Asegura que el usuario esté autenticado antes de intentar leer de Firestore.
    if (!userId) {
        showToast('❌ Error: Usuario no autenticado. Intenta recargar la página.'); // Mensaje de usuario no autenticado.
        console.error('Operación de Firestore intentada sin usuario autenticado.');
        resultadoDiv.innerHTML = '<p>Error al cargar clientes.</p>';
        return;
    }

    try {
        // Obtiene una referencia a la colección 'clientes'.
        const clientesCol = collection(db, 'clientes');
        // Recupera todos los documentos de la colección 'clientes'.
        // Para conjuntos de datos muy grandes, considera implementar búsquedas del lado del servidor o consultas de Firestore más específicas
        // si se necesitan coincidencias exactas, pero para coincidencias parciales, el filtrado del lado del cliente es común.
        const querySnapshot = await getDocs(clientesCol);

        let encontrado = false;
        resultadoDiv.innerHTML = ''; // Borra los resultados de búsqueda anteriores.

        // Itera sobre cada documento recuperado de Firestore.
        querySnapshot.forEach(doc => {
            const data = doc.data(); // Obtiene los campos de datos del documento.
            // Formatea el número de carro para mostrarlo, si existe.
            const carNumberDisplay = data.carNumber ? `${data.carNumber}` : 'No asignado';

            // Realiza una búsqueda que no distingue entre mayúsculas y minúsculas en los campos 'nombre' y 'placa'.
            // También permite buscar por número de carro exacto (como string para la comparación de entrada)
            if (
                data.nombre.toLowerCase().includes(criterio) ||
                data.placa.toLowerCase().includes(criterio) ||
                (data.carNumber && data.carNumber.toString() === criterio) // Permite buscar por número de carro
            ) {
                // Si se encuentra una coincidencia, agrega los detalles del cliente al div de resultados.
                resultadoDiv.innerHTML += `
                    <div style="background-color: #fff; color: #000; padding: 10px; margin: 10px 0; border-radius: 8px;">
                        <p><strong>Nombre:</strong> ${data.nombre}</p>
                        <p><strong>Teléfono:</strong> ${data.telefono}</p>
                        <p><strong>Placa:</strong> ${data.placa}</p>
                        <p><strong>Número de Carro:</strong> ${carNumberDisplay}</p> <!-- Muestra el número de carro -->
                    </div>`;
                encontrado = true; // Marca que se encontró al menos un cliente.
            }
        });

        // Si no se encontraron clientes después de revisar todos los documentos, muestra un mensaje.
        if (!encontrado) {
            resultadoDiv.innerHTML = '<p>No se encontró ningún cliente con ese criterio.</p>';
        }
    } catch (error) {
        console.error('Error al buscar cliente:', error);
        showToast("❌ Error al buscar cliente"); // Muestra el mensaje de error.
        resultadoDiv.innerHTML = '<p>Error al cargar clientes.</p>';
    }
}

/**
 * Muestra una notificación temporal de "toast" con un mensaje dado.
 * El "toast" se ocultará automáticamente después de 3 segundos.
 * @param {string} mensaje - El texto del mensaje que se mostrará en el "toast".
 */
function showToast(mensaje) {
    const toast = document.getElementById("toast");
    toast.textContent = mensaje; // Establece el texto del mensaje.
    toast.classList.add("show"); // Agrega la clase 'show' para hacer visible el "toast" (CSS maneja la animación).
    setTimeout(() => {
        toast.classList.remove("show"); // Elimina la clase 'show' después de 3 segundos para ocultar el "toast".
    }, 3000); // 3000 milisegundos = 3 segundos.
}

// Hace que las funciones sean accesibles globalmente. Esto es necesario cuando se usan Módulos ES (type="module" en HTML)
// y se llaman funciones directamente desde los atributos `onclick` de HTML.
window.showSection = showSection;
window.insertarCliente = insertarCliente;
window.buscarCliente = buscarCliente;
window.showToast = showToast;
