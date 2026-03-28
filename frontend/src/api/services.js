import API from './axios';

// Auth
export const register = (data) => API.post('/users/register/', data);
export const login = (data) => API.post('/users/login/', data);
export const logout = (data) => API.post('/users/logout/', data);
export const getProfile = () => API.get('/users/profile/');
export const updateProfile = (data) => API.patch('/users/profile/', data, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const getUserDetail = (id) => API.get(`/users/${id}/`);
export const subscribe = (userId) => API.post(`/users/${userId}/subscribe/`);
export const checkSubscription = (userId) => API.get(`/users/${userId}/subscription-check/`);
export const getSubscriptions = () => API.get('/users/subscriptions/');

// Videos
export const uploadVideo = (formData, onProgress) =>
  API.post('/videos/upload/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: onProgress,
  });
export const getVideos = (params) => API.get('/videos/', { params });
export const getVideoDetail = (id) => API.get(`/videos/${id}/`);
export const deleteVideo = (id) => API.delete(`/videos/${id}/delete/`);
export const updateVideo = (id, data) => API.patch(`/videos/${id}/update/`, data, {
  headers: { 'Content-Type': 'multipart/form-data' },
});
export const getMyVideos = () => API.get('/videos/my-videos/');
export const getTrendingVideos = () => API.get('/videos/trending/');
export const likeVideo = (id) => API.post(`/videos/${id}/like/`);
export const getComments = (videoId) => API.get(`/videos/${videoId}/comments/`);
export const addComment = (videoId, data) => API.post(`/videos/${videoId}/comments/`, data);
export const deleteComment = (id) => API.delete(`/videos/comments/${id}/delete/`);
export const getCategories = () => API.get('/videos/categories/');
export const incrementView = (videoId) => API.post(`/videos/${videoId}/view/`);

// Recommendations
export const getRecommendations = () => API.get('/recommendations/for-me/');
export const getSimilarVideos = (videoId) => API.get(`/recommendations/similar/${videoId}/`);

// Analytics
export const recordWatchProgress = (data) => API.post('/analytics/watch-progress/', data);
export const getWatchHistory = () => API.get('/analytics/history/');
export const getUserStats = () => API.get('/analytics/user-stats/');

// Search
export const getSearchSuggestions = (q) => API.get(`/videos/search-suggestions/?q=${encodeURIComponent(q)}`);

// Subscription feed
export const getSubscriptionFeed = () => API.get('/users/subscriptions/feed/');

// Playlists
export const getPlaylists = (params) => API.get('/videos/playlists/', { params });
export const createPlaylist = (data) => API.post('/videos/playlists/', data);
export const getPlaylist = (id) => API.get(`/videos/playlists/${id}/`);
export const updatePlaylist = (id, data) => API.patch(`/videos/playlists/${id}/`, data);
export const deletePlaylist = (id) => API.delete(`/videos/playlists/${id}/`);
export const addVideoToPlaylist = (playlistId, videoId) => API.post(`/videos/playlists/${playlistId}/add-video/`, { video: videoId });
export const removeVideoFromPlaylist = (playlistId, videoId) => API.delete(`/videos/playlists/${playlistId}/remove-video/${videoId}/`);
export const getUserPlaylists = (userId, params) => API.get(`/videos/playlists/user/${userId}/`, { params });
