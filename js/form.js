// form.js - Versão Completa e Corrigida

// ------------------------------------
// 1. Funções Auxiliares (Completadas)
// ------------------------------------

/**
 * Exibe uma notificação pop-up.
 * @param {string} message - A mensagem a ser exibida.
 * @param {string} type - O tipo de notificação ('success' ou 'error').
 */
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    Object.assign(notification.style, {
        position: 'fixed',
        top: '20px',
        right: '20px',
        padding: '1rem 1.5rem',
        borderRadius: '8px',
        color: 'white',
        zIndex: '10001',
        transform: 'translateX(100%)',
        transition: 'transform 0.3s ease',
        backgroundColor: type === 'success' ? '#4ecdc4' : '#ff6b6b'
    });

    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.transform = 'translateX(0)';
    }, 100);

    setTimeout(() => {
        notification.style.transform = 'translateX(100%)';
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 300);
    }, 4000);
}

/**
 * Exibe um modal de sucesso (placeholder).
 */
function showModal() {
    // Esta é uma implementação simples. Você pode adicionar a lógica
    // para exibir seu modal real aqui.
    console.log('Modal de sucesso exibido. Formulário enviado.');
    showNotification('Sua solicitação foi enviada com sucesso!', 'success');
}

/**
 * Define o estado de carregamento do botão de envio.
 * @param {HTMLElement} button - O botão de envio.
 * @param {boolean} isLoading - Se está em estado de carregamento.
 */
function setSubmitButtonLoading(button, isLoading) {
    if (isLoading) {
        button.classList.add('loading');
        button.disabled = true;
    } else {
        button.classList.remove('loading');
        button.disabled = false;
    }
}

/**
 * Rastreia o envio do formulário para fins de análise (analytics).
 * @param {Object} data - Os dados do formulário enviados.
 */
function trackFormSubmission(data) {
    console.log('Form submitted:', {
        timestamp: new Date().toISOString(),
        fields: Object.keys(data),
    });
    if (typeof gtag !== 'undefined') {
        gtag('event', 'form_submit', {
            event_category: 'engagement',
            event_label: 'quote_request'
        });
    }
}

/**
 * Função utilitária para debounce (evita múltiplas chamadas rápidas).
 * @param {Function} func - A função a ser executada.
 * @param {number} delay - O tempo de espera em milissegundos.
 */
function debounce(func, delay) {
    let timeoutId;
    return function (...args) {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func.apply(this, args), delay);
    };
}

// ------------------------------------
// 2. Lógica Principal do Formulário
// ------------------------------------

// Inicializa o formulário quando o DOM está carregado
document.addEventListener('DOMContentLoaded', function() {
    initializeQuoteForm();
    initAutoSave(); // Inicializa o auto-save na inicialização
});

/**
 * Inicializa a funcionalidade do formulário de orçamento.
 */
function initializeQuoteForm() {
    const form = document.getElementById('quote-form');
    if (!form) return;

    addFormValidation();
    form.addEventListener('submit', handleFormSubmit);
    addRealTimeValidation();
    initializePhoneFormatting();
}

/**
 * Lida com o envio do formulário.
 * @param {Event} event - O evento de envio.
 */
async function handleFormSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('.submit-btn');
    const formData = new FormData(form);

    if (!validateForm(form)) {
        showNotification('Por favor, corrija os erros no formulário.', 'error');
        return;
    }

    setSubmitButtonLoading(submitBtn, true);

    try {
        const data = {
            firstName: formData.get('firstName').trim(),
            lastName: formData.get('lastName').trim(),
            email: formData.get('email').trim(),
            phone: formData.get('phone').trim(),
            countryCode: formData.get('countryCode'),
            projectDescription: formData.get('projectDescription').trim()
        };
        
        // Chamada para a função da API no database-new.js
        const response = await window.BragaWorkDB.submitQuote(data);
        
        if (response.success) {
            showModal();
            form.reset();
            trackFormSubmission(data);
            clearSavedData(); // Limpa os dados salvos após o sucesso
        } else {
            showNotification(response.message || 'Erro ao enviar solicitação.', 'error');
        }

    } catch (error) {
        console.error('Form submission error:', error);
        showNotification('Erro ao enviar solicitação. Tente novamente.', 'error');
    } finally {
        setSubmitButtonLoading(submitBtn, false);
    }
}

/**
 * Valida o formulário inteiro.
 * @param {HTMLElement} form - O elemento do formulário.
 * @returns {boolean} - True se o formulário for válido, false caso contrário.
 */
function validateForm(form) {
    const fields = {
        firstName: form.querySelector('#firstName'),
        lastName: form.querySelector('#lastName'),
        email: form.querySelector('#email'),
        phone: form.querySelector('#phone'),
        countryCode: form.querySelector('#countryCode'),
        projectDescription: form.querySelector('#projectDescription')
    };
    
    let isValid = true;
    clearFormErrors(form);

    for (const [fieldName, field] of Object.entries(fields)) {
        if (!field) continue;
        const validation = validateField(fieldName, field.value);
        if (!validation.isValid) {
            showFieldError(field, validation.message);
            isValid = false;
        }
    }
    return isValid;
}

/**
 * Valida um campo individualmente.
 * @param {string} fieldName - O nome do campo.
 * @param {string} value - O valor do campo.
 * @returns {Object} - Objeto com a validade e a mensagem de erro.
 */
function validateField(fieldName, value) {
    const validators = {
        firstName: (val) => ({
            isValid: val.length >= 2 && val.length <= 50 && /^[a-zA-ZÀ-ÿ\s]+$/.test(val),
            message: 'Nome deve ter entre 2-50 caracteres e conter apenas letras.'
        }),
        lastName: (val) => ({
            isValid: val.length >= 2 && val.length <= 50 && /^[a-zA-ZÀ-ÿ\s]+$/.test(val),
            message: 'Sobrenome deve ter entre 2-50 caracteres e conter apenas letras.'
        }),
        email: (val) => ({
            isValid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val) && val.length <= 255,
            message: 'Digite um email válido.'
        }),
        phone: (val) => {
            const cleaned = val.replace(/\D/g, '');
            return {
                isValid: cleaned.length >= 10 && cleaned.length <= 15,
                message: 'Digite um telefone válido.'
            };
        },
        countryCode: (val) => ({
            isValid: val && val.length > 0,
            message: 'Selecione o código do país.'
        }),
        projectDescription: (val) => ({
            isValid: val.length >= 20 && val.length <= 2000,
            message: 'Descrição deve ter entre 20-2000 caracteres.'
        })
    };
    const validator = validators[fieldName];
    if (!validator) {
        return { isValid: true, message: '' };
    }
    return validator(value.trim());
}

/**
 * Adiciona validação em tempo real aos campos.
 */
function addRealTimeValidation() {
    const form = document.getElementById('quote-form');
    if (!form) return;
    const fields = form.querySelectorAll('input, textarea, select');
    fields.forEach(field => {
        field.addEventListener('blur', function() {
            const fieldName = this.name;
            const validation = validateField(fieldName, this.value);
            if (!validation.isValid && this.value.trim()) {
                showFieldError(this, validation.message);
            } else {
                clearFieldError(this);
            }
        });
        field.addEventListener('input', function() {
            clearFieldError(this);
        });
    });
}

/**
 * Adiciona validação e padrões de formato aos campos do formulário.
 */
function addFormValidation() {
    const form = document.getElementById('quote-form');
    if (!form) return;
    const firstName = form.querySelector('#firstName');
    if (firstName) {
        firstName.setAttribute('pattern', '[a-zA-ZÀ-ÿ\\s]{2,50}');
        firstName.setAttribute('title', 'Nome deve conter apenas letras e ter entre 2-50 caracteres');
    }
    const lastName = form.querySelector('#lastName');
    if (lastName) {
        lastName.setAttribute('pattern', '[a-zA-ZÀ-ÿ\\s]{2,50}');
        lastName.setAttribute('title', 'Sobrenome deve conter apenas letras e ter entre 2-50 caracteres');
    }
    const email = form.querySelector('#email');
    if (email) {
        email.setAttribute('pattern', '[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,4}$');
    }
    const projectDescription = form.querySelector('#projectDescription');
    if (projectDescription) {
        projectDescription.setAttribute('minlength', '20');
        projectDescription.setAttribute('maxlength', '2000');
        addCharacterCounter(projectDescription);
    }
}

/**
 * Adiciona um contador de caracteres a um campo de texto.
 * @param {HTMLTextAreaElement} textarea - O elemento textarea.
 */
function addCharacterCounter(textarea) {
    const counter = document.createElement('div');
    counter.className = 'character-counter';
    counter.style.cssText = `
        text-align: right;
        font-size: 0.8rem;
        color: var(--text-gray);
        margin-top: 0.25rem;
    `;
    textarea.parentNode.appendChild(counter);
    function updateCounter() {
        const current = textarea.value.length;
        const max = 2000;
        counter.textContent = `${current}/${max} caracteres`;
        if (current > max) {
            counter.style.color = 'var(--accent-color)';
        } else if (current < 20) {
            counter.style.color = 'var(--text-gray)';
        } else {
            counter.style.color = 'var(--success-color)';
        }
    }
    textarea.addEventListener('input', updateCounter);
    updateCounter();
}

/**
 * Inicializa a formatação do campo de telefone.
 */
function initializePhoneFormatting() {
    const phoneInput = document.getElementById('phone');
    const countryCodeSelect = document.getElementById('countryCode');
    
    if (!phoneInput) return;
    
    phoneInput.addEventListener('input', function(e) {
        formatPhoneNumber(this);
    });
    
    phoneInput.addEventListener('keydown', function(e) {
        if ([46, 8, 9, 27, 13].indexOf(e.keyCode) !== -1 ||
            (e.keyCode === 65 && e.ctrlKey === true) ||
            (e.keyCode === 67 && e.ctrlKey === true) ||
            (e.keyCode === 86 && e.ctrlKey === true) ||
            (e.keyCode === 88 && e.ctrlKey === true) ||
            (e.keyCode >= 35 && e.keyCode <= 39)) {
            return;
        }
        if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
            e.preventDefault();
        }
    });
    
    if (countryCodeSelect) {
        countryCodeSelect.addEventListener('change', function() {
            phoneInput.value = '';
            phoneInput.placeholder = getPhonePlaceholder(this.value);
        });
        phoneInput.placeholder = getPhonePlaceholder(countryCodeSelect.value);
    }
}

/**
 * Retorna o placeholder apropriado para o campo de telefone baseado no país.
 * @param {string} countryCode - O código do país.
 * @returns {string} O placeholder formatado.
 */
function getPhonePlaceholder(countryCode) {
    const placeholders = {
        '+55': '(11) 91234-5678',  // Brasil
        '+1': '(555) 123-4567',     // EUA/Canadá
        '+351': '912 345 678',      // Portugal
        '+34': '612 34 56 78',      // Espanha
        '+33': '6 12 34 56 78',     // França
        '+49': '151 23456789',      // Alemanha
        '+44': '7400 123456',       // Reino Unido
        '+39': '312 345 6789',      // Itália
        '+81': '90-1234-5678',      // Japão
        '+86': '138 0013 8000',     // China
        '+91': '98765 43210',       // Índia
        '+52': '55 1234 5678',      // México
        '+54': '11 1234-5678',      // Argentina
        '+56': '9 1234 5678'        // Chile
    };
    return placeholders[countryCode] || '123456789';
}

/**
 * Formata o número de telefone com base no código do país.
 * @param {HTMLInputElement} input - O campo de entrada de telefone.
 */
function formatPhoneNumber(input) {
    const countryCode = document.getElementById('countryCode').value;
    let value = input.value.replace(/\D/g, '');
    
    switch(countryCode) {
        case '+55': // Brasil
            if (value.length >= 11) {
                value = value.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
            } else if (value.length >= 7) {
                value = value.replace(/^(\d{2})(\d{4})(\d{0,4}).*/, '($1) $2-$3');
            } else if (value.length >= 3) {
                value = value.replace(/^(\d{2})(\d{0,5})/, '($1) $2');
            }
            break;
            
        case '+1': // EUA/Canadá
            if (value.length >= 10) {
                value = value.replace(/^(\d{3})(\d{3})(\d{4}).*/, '($1) $2-$3');
            } else if (value.length >= 6) {
                value = value.replace(/^(\d{3})(\d{3})(\d{0,4})/, '($1) $2-$3');
            } else if (value.length >= 3) {
                value = value.replace(/^(\d{3})(\d{0,3})/, '($1) $2');
            }
            break;
            
        case '+351': // Portugal
            if (value.length >= 9) {
                value = value.replace(/^(\d{3})(\d{3})(\d{3}).*/, '$1 $2 $3');
            } else if (value.length >= 6) {
                value = value.replace(/^(\d{3})(\d{3})(\d{0,3})/, '$1 $2 $3');
            } else if (value.length >= 3) {
                value = value.replace(/^(\d{3})(\d{0,3})/, '$1 $2');
            }
            break;
            
        case '+34': // Espanha
            if (value.length >= 9) {
                value = value.replace(/^(\d{3})(\d{2})(\d{2})(\d{2}).*/, '$1 $2 $3 $4');
            } else if (value.length >= 5) {
                value = value.replace(/^(\d{3})(\d{2})(\d{0,4})/, '$1 $2 $3');
            } else if (value.length >= 3) {
                value = value.replace(/^(\d{3})(\d{0,2})/, '$1 $2');
            }
            break;
            
        case '+33': // França
            if (value.length >= 9) {
                value = value.replace(/^(\d{1})(\d{2})(\d{2})(\d{2})(\d{2}).*/, '$1 $2 $3 $4 $5');
            } else if (value.length >= 7) {
                value = value.replace(/^(\d{1})(\d{2})(\d{2})(\d{2})(\d{0,2})/, '$1 $2 $3 $4 $5');
            } else if (value.length >= 5) {
                value = value.replace(/^(\d{1})(\d{2})(\d{2})(\d{0,2})/, '$1 $2 $3 $4');
            } else if (value.length >= 3) {
                value = value.replace(/^(\d{1})(\d{2})(\d{0,2})/, '$1 $2 $3');
            }
            break;
            
        case '+49': // Alemanha
        case '+39': // Itália
        case '+44': // Reino Unido
            if (value.length >= 10) {
                value = value.replace(/^(\d{3})(\d{3})(\d{4}).*/, '$1 $2 $3');
            } else if (value.length >= 6) {
                value = value.replace(/^(\d{3})(\d{3})(\d{0,4})/, '$1 $2 $3');
            } else if (value.length >= 3) {
                value = value.replace(/^(\d{3})(\d{0,3})/, '$1 $2');
            }
            break;
            
        case '+81': // Japão
            if (value.length >= 10) {
                value = value.replace(/^(\d{2})(\d{4})(\d{4}).*/, '$1-$2-$3');
            } else if (value.length >= 6) {
                value = value.replace(/^(\d{2})(\d{4})(\d{0,4})/, '$1-$2-$3');
            } else if (value.length >= 2) {
                value = value.replace(/^(\d{2})(\d{0,4})/, '$1-$2');
            }
            break;
            
        case '+86': // China
        case '+91': // Índia
            if (value.length >= 10) {
                value = value.replace(/^(\d{3})(\d{4})(\d{3,4}).*/, '$1 $2 $3');
            } else if (value.length >= 7) {
                value = value.replace(/^(\d{3})(\d{4})(\d{0,3})/, '$1 $2 $3');
            } else if (value.length >= 3) {
                value = value.replace(/^(\d{3})(\d{0,4})/, '$1 $2');
            }
            break;
            
        case '+52': // México
        case '+54': // Argentina
        case '+56': // Chile
            if (value.length >= 10) {
                value = value.replace(/^(\d{2})(\d{4})(\d{4}).*/, '$1 $2 $3');
            } else if (value.length >= 6) {
                value = value.replace(/^(\d{2})(\d{4})(\d{0,4})/, '$1 $2 $3');
            } else if (value.length >= 2) {
                value = value.replace(/^(\d{2})(\d{0,4})/, '$1 $2');
            }
            break;
            
        default: // Formato internacional genérico
            if (value.length > 10) {
                value = value.replace(/^(\d{3})(\d{3})(\d{4}).*/, '$1 $2 $3');
            } else if (value.length > 6) {
                value = value.replace(/^(\d{3})(\d{3})(\d{0,4})/, '$1 $2 $3');
            } else if (value.length > 3) {
                value = value.replace(/^(\d{3})(\d{0,3})/, '$1 $2');
            }
    }
    
    input.value = value;
}

/**
 * Exibe uma mensagem de erro abaixo de um campo.
 * @param {HTMLElement} field - O campo com erro.
 * @param {string} message - A mensagem de erro.
 */
function showFieldError(field, message) {
    clearFieldError(field);
    field.classList.add('error');
    field.style.borderColor = 'var(--accent-color)';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.cssText = `
        color: var(--accent-color);
        font-size: 0.8rem;
        margin-top: 0.25rem;
        animation: fadeIn 0.3s ease;
    `;
    field.parentNode.appendChild(errorDiv);
}

/**
 * Limpa a mensagem de erro de um campo.
 * @param {HTMLElement} field - O campo.
 */
function clearFieldError(field) {
    field.classList.remove('error');
    field.style.borderColor = '';
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
        errorDiv.remove();
    }
}

/**
 * Limpa todos os erros do formulário.
 * @param {HTMLElement} form - O formulário.
 */
function clearFormErrors(form) {
    const errorFields = form.querySelectorAll('.error');
    const errorMessages = form.querySelectorAll('.field-error');
    errorFields.forEach(field => {
        field.classList.remove('error');
        field.style.borderColor = '';
    });
    errorMessages.forEach(message => message.remove());
}

// ------------------------------------
// 3. Funções de Auto-Save
// ------------------------------------

const STORAGE_KEY = 'quote_form_draft';

/**
 * Carrega os dados salvos do formulário do localStorage.
 */
function loadSavedData() {
    const form = document.getElementById('quote-form');
    if (!form) return;
    try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
            const data = JSON.parse(saved);
            Object.keys(data).forEach(key => {
                const field = form.querySelector(`[name="${key}"]`);
                if (field && data[key]) {
                    field.value = data[key];
                }
            });
        }
    } catch (error) {
        console.log('Could not load saved form data');
    }
}

/**
 * Salva os dados do formulário no localStorage.
 */
function saveFormData() {
    const form = document.getElementById('quote-form');
    if (!form) return;
    try {
        const formData = new FormData(form);
        const data = {};
        for (let [key, value] of formData.entries()) {
            data[key] = value;
        }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
        console.log('Could not save form data');
    }
}

/**
 * Limpa os dados salvos do formulário no localStorage.
 */
function clearSavedData() {
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
        console.log('Could not clear saved form data');
    }
}

/**
 * Inicializa a funcionalidade de auto-save.
 */
function initAutoSave() {
    const form = document.getElementById('quote-form');
    if (!form) return;

    loadSavedData();
    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        input.addEventListener('input', debounce(saveFormData, 1000));
    });
}