document.addEventListener('DOMContentLoaded', () => {
    // --- 1. Referencias a elementos del DOM de history.html ---
    const passwordListDiv = document.getElementById('passwordList');
    const noPasswordsMessage = document.getElementById('noPasswordsMessage');
    const darkModeToggle = document.getElementById('darkModeToggle');
    const messageContainer = document.getElementById('messageContainer');

    // Referencias a elementos del MODAL de confirmación
    const confirmationModal = document.getElementById('confirmationModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const closeButton = document.querySelector('.close-button');

    // Referencias a elementos para añadir contraseña existente
    const existingPasswordNameInput = document.getElementById('existingPasswordName');
    const existingPasswordValueInput = document.getElementById('existingPasswordValue');
    const addExistingPasswordBtn = document.getElementById('addExistingPasswordBtn');

    let db; // Variable para almacenar la instancia de la base de datos IndexedDB
    let passwordIdToDelete = null; // Almacena el ID de la contraseña que se va a eliminar
    let messageTimeout; // Para controlar el temporizador del mensaje

    // --- 2. Funcionalidad del Modo Oscuro ---
    const applyDarkMode = (isDarkMode) => {
        document.body.classList.toggle('dark-mode', isDarkMode);
        if (darkModeToggle) { // Asegura que el botón exista antes de intentar cambiar su texto
            darkModeToggle.textContent = isDarkMode ? 'Desactivar Modo Oscuro' : 'Activar Modo Oscuro';
        }
        localStorage.setItem('dark-mode', isDarkMode);
    };

    // Cargar preferencia de modo oscuro al iniciar la página
    const savedDarkMode = localStorage.getItem('dark-mode') === 'true';
    applyDarkMode(savedDarkMode);

    // Event Listener para el botón de modo oscuro
    if (darkModeToggle) {
        darkModeToggle.addEventListener('click', () => {
            const isCurrentlyDarkMode = document.body.classList.contains('dark-mode');
            applyDarkMode(!isCurrentlyDarkMode);
        });
    }

    // --- 3. Inicialización de IndexedDB ---
    const openDbRequest = indexedDB.open('PasswordManagerDB', 1);

    openDbRequest.onupgradeneeded = function(event) {
        db = event.target.result;
        const objectStore = db.createObjectStore('passwords', { keyPath: 'id', autoIncrement: true });
        objectStore.createIndex('name', 'name', { unique: false });
        console.log('Object store "passwords" creado/actualizado.');
    };

    openDbRequest.onsuccess = function(event) {
        db = event.target.result;
        console.log('Base de datos abierta con éxito.');
        loadPasswords(); // Carga las contraseñas al iniciar esta página
    };

    openDbRequest.onerror = function(event) {
        console.error('Error al abrir la base de datos:', event.target.errorCode);
        showMessage('No se pudo inicializar la base de datos local. Algunas funciones podrían no estar disponibles.', 'error');
    };

    // --- 4. Función para añadir contraseña existente ---
    if (addExistingPasswordBtn && existingPasswordNameInput && existingPasswordValueInput) {
        addExistingPasswordBtn.addEventListener('click', () => {
            const passwordName = existingPasswordNameInput.value.trim();
            const passwordValue = existingPasswordValueInput.value.trim();

            if (!passwordName) {
                showMessage('Por favor, ingresa un nombre para la contraseña.', 'error');
                return;
            }
            if (!passwordValue) {
                showMessage('Por favor, ingresa la contraseña existente.', 'error');
                return;
            }

            savePasswordToDB({ name: passwordName, password: passwordValue });
        });
    }

    // Función auxiliar para guardar una contraseña en la DB
    function savePasswordToDB(passwordData) {
        if (!db) {
            showMessage('La base de datos no está lista. Inténtalo de nuevo en un momento.', 'error');
            return;
        }

        const transaction = db.transaction(['passwords'], 'readwrite');
        const objectStore = transaction.objectStore('passwords');

        // Verifica si ya existe una contraseña con el mismo nombre
        const nameIndex = objectStore.index('name');
        const getRequest = nameIndex.get(passwordData.name);

        getRequest.onsuccess = (event) => {
            if (event.target.result) {
                showMessage('Ya existe una contraseña con ese nombre. Por favor, usa uno diferente.', 'error');
                return;
            }

            const newPassword = {
                name: passwordData.name,
                password: passwordData.password,
                date: new Date().toISOString()
            };
            const addRequest = objectStore.add(newPassword);

            addRequest.onsuccess = () => {
                showMessage('Contraseña guardada con éxito!', 'success');
                if (existingPasswordNameInput) existingPasswordNameInput.value = '';
                if (existingPasswordValueInput) existingPasswordValueInput.value = '';
                loadPasswords(); // Recarga la lista
            };

            addRequest.onerror = (event) => {
                console.error('Error al guardar la contraseña:', event.target.error);
                showMessage('Error al guardar la contraseña. Inténtalo de nuevo.', 'error');
            };
        };

        getRequest.onerror = (event) => {
            console.error('Error al verificar nombre de contraseña:', event.target.error);
            showMessage('Error al verificar el nombre de la contraseña.', 'error');
        };
    }

    // --- 5. Función para cargar y mostrar contraseñas desde IndexedDB ---
    function loadPasswords() {
        if (!db || !passwordListDiv) {
            return;
        }

        passwordListDiv.innerHTML = '';
        const transaction = db.transaction(['passwords'], 'readonly');
        const objectStore = transaction.objectStore('passwords');
        const request = objectStore.openCursor();

        let passwordsFound = false;

        request.onsuccess = (event) => {
            const cursor = event.target.result;
            if (cursor) {
                passwordsFound = true;
                const passwordItem = document.createElement('div');
                passwordItem.classList.add('password-item');
                passwordItem.dataset.id = cursor.value.id;

                passwordItem.innerHTML = `
                    <span class="name">${cursor.value.name}</span>
                    <span class="password">${cursor.value.password}</span>
                    <div class="actions">
                        <button class="copy-btn">Copiar</button>
                        <button class="delete-btn">Borrar</button>
                    </div>
                `;

                passwordListDiv.appendChild(passwordItem);
                cursor.continue();
            } else {
                if (noPasswordsMessage) {
                    noPasswordsMessage.style.display = passwordsFound ? 'none' : 'block';
                }
                attachPasswordItemEventListeners(); // Adjunta los eventos una vez que todos los elementos están en el DOM
            }
        };

        request.onerror = (event) => {
            console.error('Error al cargar contraseñas:', event.target.error);
            showMessage('Error al cargar las contraseñas.', 'error');
        };
    }

    // --- 6. Función para adjuntar eventos a los botones de "Copiar" y "Borrar" ---
    function attachPasswordItemEventListeners() {
        document.querySelectorAll('.password-item .copy-btn').forEach(button => {
            button.onclick = (event) => {
                const passwordElement = event.target.closest('.password-item').querySelector('.password');
                const passwordToCopy = passwordElement.textContent;
                navigator.clipboard.writeText(passwordToCopy)
                    .then(() => {
                        showMessage('¡Contraseña copiada al portapapeles!', 'success');
                    })
                    .catch(err => {
                        console.error('Error al copiar la contraseña: ', err);
                        showMessage('No se pudo copiar la contraseña. Por favor, cópiala manualmente.', 'error');
                    });
            };
        });

        document.querySelectorAll('.password-item .delete-btn').forEach(button => {
            button.onclick = (event) => {
                const passwordItem = event.target.closest('.password-item');
                passwordIdToDelete = parseInt(passwordItem.dataset.id);
                showModal();
            };
        });
    }

    // --- 7. Función para eliminar contraseña de IndexedDB ---
    function deletePassword(id) {
        if (!db) {
            console.warn('La base de datos no está inicializada.');
            return;
        }

        const transaction = db.transaction(['passwords'], 'readwrite');
        const objectStore = transaction.objectStore('passwords');
        const request = objectStore.delete(id);

        request.onsuccess = () => {
            showMessage('Contraseña eliminada con éxito!', 'success');
            loadPasswords();
            hideModal();
        };

        request.onerror = (event) => {
            console.error('Error al eliminar contraseña:', event.target.error);
            showMessage('Error al eliminar la contraseña. Inténtalo de nuevo.', 'error');
            hideModal();
        };
    }

    // --- 8. Funciones para controlar el Modal de Confirmación ---
    if (confirmationModal) {
        function showModal() {
            confirmationModal.classList.add('show');
        }

        function hideModal() {
            confirmationModal.classList.remove('show');
            passwordIdToDelete = null;
        }

        confirmDeleteBtn.addEventListener('click', () => {
            if (passwordIdToDelete !== null) {
                deletePassword(passwordIdToDelete);
            }
        });

        cancelDeleteBtn.addEventListener('click', () => {
            hideModal();
        });

        closeButton.addEventListener('click', () => {
            hideModal();
        });

        window.addEventListener('click', (event) => {
            if (event.target === confirmationModal) {
                hideModal();
            }
        });
    }

    // --- 9. Función para mostrar mensajes dinámicos ---
    function showMessage(message, type) {
        if (!messageContainer) return;

        if (messageTimeout) {
            clearTimeout(messageTimeout);
        }

        messageContainer.classList.remove('success', 'error');
        messageContainer.textContent = message;
        messageContainer.classList.add(type);
        messageContainer.classList.add('show');

        messageTimeout = setTimeout(() => {
            messageContainer.classList.remove('show');
            setTimeout(() => {
                messageContainer.textContent = '';
                messageContainer.classList.remove(type);
            }, 500);
        }, 3000);
    }
});