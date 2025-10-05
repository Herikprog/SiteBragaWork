window.BragaWorkDB = window.BragaWorkDB || {};

let authToken = localStorage.getItem('bragawork_auth_token');

const apiRequest = async (endpoint, options = {}) => {
  const apiEndpoint = `${window.location.origin}/api/${endpoint}`;

  if (authToken && !endpoint.includes('login') && !endpoint.includes('submit-quote')) {
    options.headers = options.headers || {};
    options.headers['Authorization'] = `Bearer ${authToken}`;
  }

  try {
    const res = await fetch(apiEndpoint, options);
    
    if (!res.ok) {
      if (res.status === 401) {
        authToken = null;
        localStorage.removeItem('bragawork_auth_token');
        if (typeof logout === 'function') {
          logout();
        }
        return { success: false, message: 'Sessão expirada. Faça login novamente.' };
      }
      
      const errorData = await res.json().catch(() => ({ message: 'Erro desconhecido do servidor.' }));
      throw new Error(errorData.message || `Erro no servidor: ${res.status}`);
    }
    
    return res.json();

  } catch (error) {
    console.error(`Erro na requisição para ${endpoint}:`, error);
    return { success: false, message: error.message };
  }
};

window.BragaWorkDB.submitQuote = async function(data) {
  return apiRequest('submit-quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
};

window.BragaWorkDB.login = async function(username, password) {
  const response = await apiRequest('login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  
  if (response.success && response.token) {
    authToken = response.token;
    localStorage.setItem('bragawork_auth_token', response.token);
  }
  
  return response;
};

window.BragaWorkDB.logout = function() {
  authToken = null;
  localStorage.removeItem('bragawork_auth_token');
};

window.BragaWorkDB.getQuotes = async function() {
  return apiRequest('get-quotes');
};

window.BragaWorkDB.updateQuoteStatus = async function(id, status) {
  return apiRequest('update-quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, status }),
  });
};

window.BragaWorkDB.deleteQuote = async function(id) {
  return apiRequest('delete-quote', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id }),
  });
};

window.BragaWorkDB.getProjects = async function(isAdmin = false) {
  const endpoint = isAdmin ? 'get-projects?admin=true' : 'get-projects';
  return apiRequest(endpoint);
};

window.BragaWorkDB.saveProject = async function(projectData) {
  return apiRequest('save-project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projectData),
  });
};

window.BragaWorkDB.deleteProject = async function(projectId) {
  return apiRequest('delete-project', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: projectId }),
  });
};

window.BragaWorkDB.uploadImage = async function(file) {
  const formData = new FormData();
  formData.append('image', file);
  
  const apiEndpoint = `${window.location.origin}/api/upload-image`;
  
  try {
    const res = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`
      },
      body: formData
    });
    
    if (!res.ok) {
      if (res.status === 401) {
        authToken = null;
        localStorage.removeItem('bragawork_auth_token');
        if (typeof logout === 'function') {
          logout();
        }
        return { success: false, message: 'Sessão expirada. Faça login novamente.' };
      }
      
      const errorData = await res.json().catch(() => ({ message: 'Erro desconhecido do servidor.' }));
      throw new Error(errorData.message || `Erro no servidor: ${res.status}`);
    }
    
    return res.json();
  } catch (error) {
    console.error('Erro no upload de imagem:', error);
    return { success: false, message: error.message };
  }
};
