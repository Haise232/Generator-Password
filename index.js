document.addEventListener('DOMContentLoaded', () => {
    // 1. Elementos del DOM
    const darkModeToggle = document.getElementById('darkModeToggle');
    const passwordLengthInput = document.getElementById('passwordLength');
    const includeUppercaseCheckbox = document.getElementById('includeUppercase');
    const includeLowercaseCheckbox = document.getElementById('includeLowercase');
    const includeNumbersCheckbox = document.getElementById('includeNumbers');
    const includeSymbolsCheckbox = document.getElementById('includeSymbols');
    const generatePasswordBtn = document.getElementById('generatePassword');
    const generatedPasswordInput = document.getElementById('generatedPassword');
    const copyPasswordBtn = document.getElementById('copyPassword');
    const passwordNameInput = document.getElementById('passwordName');
    const savePasswordBtn = document.getElementById('savePassword');
    const passwordListDiv = document.getElementById('passwordList');
    const noPasswordsMessage = document.getElementById('noPasswordsMessage');
    const messageContainer = document.getElementById('messageContainer');

    // Modal de confirmación
    const confirmationModal = document.getElementById('confirmationModal');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const closeButton = document.querySelector('.close-button');

    let passwordToDeleteId = null; // Variable para almacenar el ID de la contraseña a eliminar

    // 2. Funcionalidad de Modo Oscuro
    const applyDarkMode = (isDarkMode) => {
        document.body.classList.toggle('dark-mode', isDarkMode);
        darkModeToggle.textContent = isDarkMode ? 'Desactivar Modo Oscuro' : 'Activar Modo Oscuro';
        localStorage.setItem('dark-mode', isDarkMode);
    };

    // Cargar preferencia de modo oscuro al iniciar
    const savedDarkMode = localStorage.getItem('dark-mode') === 'true';
    applyDarkMode(savedDarkMode);

    darkModeToggle.addEventListener('click', () => {
        const isCurrentlyDarkMode = document.body.classList.contains('dark-mode');
        applyDarkMode(!isCurrentlyDarkMode);
    });

    // 3. Generación de Contraseñas
    const generatePassword = () => {
        const length = parseInt(passwordLengthInput.value);
        const includeUppercase = includeUppercaseCheckbox.checked;
        const includeLowercase = includeLowercaseCheckbox.checked;
        const includeNumbers = includeNumbersCheckbox.checked;
        const includeSymbols = includeSymbolsCheckbox.checked;

        let charset = '';
        if (includeUppercase) charset += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        if (includeLowercase) charset += 'abcdefghijklmnopqrstuvwxyz';
        if (includeNumbers) charset += '0123456789';
        if (includeSymbols) charset += '!@#$%^&*()_+~`|}{[]:;?><,./-=';

        if (charset === '') {
            showMessage('Por favor, selecciona al menos un tipo de carácter.', 'error');
            generatedPasswordInput.value = '';
            return;
        }

        let password = '';
        for (let i = 0; i < length; i++) {
            const randomIndex = Math.floor(Math.random() * charset.length);
            password += charset[randomIndex];
        }

        generatedPasswordInput.value = password;
        showMessage('Contraseña generada con éxito.', 'success');
    };

    generatePasswordBtn.addEventListener('click', generatePassword);

    // 4. Copiar Contraseña
    copyPasswordBtn.addEventListener('click', () => {
        const password = generatedPasswordInput.value;
        if (password) {
            navigator.clipboard.writeText(password)
                .then(() => {
                    showMessage('Contraseña copiada al portapapeles.', 'success');
                })
                .catch(err => {
                    console.error('Error al copiar la contraseña:', err);
                    showMessage('Error al copiar la contraseña.', 'error');
                });
        } else {
            showMessage('No hay contraseña para copiar.', 'error');
        }
    });

    // 5. Guardar Contraseña
    const getPasswords = () => {
        return JSON.parse(localStorage.getItem('passwords')) || [];
    };

    const savePasswords = (passwords) => {
        localStorage.setItem('passwords', JSON.stringify(passwords));
    };

    const displayPasswords = () => {
        const passwords = getPasswords();
        passwordListDiv.innerHTML = ''; // Limpiar lista existente

        if (passwords.length === 0) {
            noPasswordsMessage.style.display = 'block';
            passwordListDiv.appendChild(noPasswordsMessage);
            return;
        } else {
            noPasswordsMessage.style.display = 'none';
        }

        passwords.forEach(pw => {
            const passwordItem = document.createElement('div');
            passwordItem.classList.add('password-item');
            passwordItem.dataset.id = pw.id;

            const nameSpan = document.createElement('span');
            nameSpan.classList.add('name');
            nameSpan.textContent = pw.name;

            const passwordSpan = document.createElement('span');
            passwordSpan.classList.add('password');
            passwordSpan.textContent = pw.password;

            const actionsDiv = document.createElement('div');
            actionsDiv.classList.add('actions');

            const copyBtn = document.createElement('button');
            copyBtn.classList.add('copy-btn');
            copyBtn.textContent = 'Copiar';
            copyBtn.addEventListener('click', () => {
                navigator.clipboard.writeText(pw.password)
                    .then(() => showMessage('Contraseña copiada.', 'success'))
                    .catch(() => showMessage('Error al copiar.', 'error'));
            });

            const deleteBtn = document.createElement('button');
            deleteBtn.classList.add('delete-btn');
            deleteBtn.textContent = 'Borrar';
            deleteBtn.addEventListener('click', () => {
                passwordToDeleteId = pw.id;
                showModal();
            });

            actionsDiv.appendChild(copyBtn);
            actionsDiv.appendChild(deleteBtn);

            passwordItem.appendChild(nameSpan);
            passwordItem.appendChild(passwordSpan);
            passwordItem.appendChild(actionsDiv);
            passwordListDiv.appendChild(passwordItem);
        });
    };

    savePasswordBtn.addEventListener('click', () => {
        const password = generatedPasswordInput.value;
        const name = passwordNameInput.value.trim();

        if (!password) {
            showMessage('Primero genera una contraseña.', 'error');
            return;
        }

        if (!name) {
            showMessage('Por favor, ingresa un nombre para la contraseña.', 'error');
            return;
        }

        const passwords = getPasswords();
        // Evitar guardar contraseñas con el mismo nombre (opcional, puedes permitir duplicados si lo prefieres)
        const existingPassword = passwords.find(pw => pw.name === name);
        if (existingPassword) {
            showMessage('Ya existe una contraseña con ese nombre. Por favor, usa otro.', 'error');
            return;
        }

        const newPassword = {
            id: Date.now(), // ID único basado en la marca de tiempo
            name: name,
            password: password
        };
        passwords.push(newPassword);
        savePasswords(passwords);
        displayPasswords();
        generatedPasswordInput.value = '';
        passwordNameInput.value = '';
        showMessage('Contraseña guardada con éxito.', 'success');
    });

    // Cargar contraseñas al iniciar la página
    displayPasswords();

    // 6. Funcionalidad del Modal
    const showModal = () => {
        confirmationModal.classList.add('show');
    };

    const hideModal = () => {
        confirmationModal.classList.remove('show');
        passwordToDeleteId = null; // Limpiar el ID al cerrar el modal
    };

    closeButton.addEventListener('click', hideModal);
    cancelDeleteBtn.addEventListener('click', hideModal);
    window.addEventListener('click', (event) => {
        if (event.target === confirmationModal) {
            hideModal();
        }
    });

    confirmDeleteBtn.addEventListener('click', () => {
        if (passwordToDeleteId !== null) {
            let passwords = getPasswords();
            passwords = passwords.filter(pw => pw.id !== passwordToDeleteId);
            savePasswords(passwords);
            displayPasswords();
            showMessage('Contraseña eliminada con éxito.', 'success');
            hideModal();
        }
    });

    // 7. Funcionalidad de Mensajes de Notificación
    const showMessage = (message, type) => {
        messageContainer.textContent = message;
        messageContainer.className = 'message-container'; // Limpiar clases anteriores
        messageContainer.classList.add(type); // 'success' o 'error'
        messageContainer.classList.add('show');

        // Ocultar el mensaje después de 3 segundos
        setTimeout(() => {
            messageContainer.classList.remove('show');
            // Opcional: limpiar el texto y las clases después de la transición
            setTimeout(() => {
                messageContainer.textContent = '';
                messageContainer.className = 'message-container';
            }, 500); // Coincide con la duración de la transición CSS
        }, 3000);
    };
});