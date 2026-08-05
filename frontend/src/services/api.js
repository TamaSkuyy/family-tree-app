import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/v1';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Attach auth token if present
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('ft_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

// Response interceptor: on 401 remove token and redirect to login
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error?.response?.status;
        const reqUrl = error?.config?.url || '';
        // If unauthorized and not currently on auth endpoints, clear token and redirect
        if (status === 401) {
            try {
                // don't redirect if already hitting auth endpoints
                if (!reqUrl.includes('/auth/login') && !reqUrl.includes('/auth/register')) {
                    localStorage.removeItem('ft_token');
                    // navigate to login page
                    if (typeof window !== 'undefined') {
                        window.location.href = '/login';
                    }
                }
            } catch (e) {
                // ignore
            }
        }
        return Promise.reject(error);
    }
);

// Person API calls
export const personAPI = {
    getAll: () => api.get('/persons'),
    getById: (id) => api.get(`/persons/${id}`),
    create: (data) => api.post('/persons', data),
    update: (id, data) => api.put(`/persons/${id}`, data),
    delete: (id) => api.delete(`/persons/${id}`),
    search: (query) => api.get('/search', { params: { q: query } }),
    getFamilyTree: (id) => api.get(`/family-tree/${id}`),
};

// Relationship API calls
export const relationshipAPI = {
    addParentChild: (parentId, childId) =>
        api.post('/relationships/parent-child', { parent_id: parentId, child_id: childId }),
    removeParentChild: (parentId, childId) =>
        api.delete(`/relationships/parent-child/${parentId}/${childId}`),
    addSpouse: (person1Id, person2Id) =>
        api.post('/relationships/spouse', { person1_id: person1Id, person2_id: person2Id }),
    removeSpouse: (person1Id, person2Id) =>
        api.delete(`/relationships/spouse/${person1Id}/${person2Id}`),
};

export default api;

export const authAPI = {
    register: (data) => api.post('/auth/register', data),
    login: (data) => api.post('/auth/login', data),
    me: () => api.get('/auth/me'),
};

// Admin APIs
export const adminAPI = {
    getUsers: () => api.get('/admin/users'),
    updateUserRole: (id, role) => api.put(`/admin/users/${id}/role`, { role }),
    createUser: (payload) => api.post('/admin/users', payload),
    updateUser: (id, payload) => api.put(`/admin/users/${id}`, payload),
    deleteUser: (id) => api.delete(`/admin/users/${id}`),
};