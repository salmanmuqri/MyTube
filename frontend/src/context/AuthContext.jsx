import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getProfile } from '../api/services';

const AuthContext = createContext(null);

function safeParseJson(value, fallback = null) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = safeParseJson(localStorage.getItem('mytube_user'), null);
    if (!saved) {
      localStorage.removeItem('mytube_user');
    }
    return saved;
  });
  const [loading, setLoading] = useState(true);

  const tokens = safeParseJson(localStorage.getItem('mytube_tokens'), null);

  useEffect(() => {
    if (tokens?.access) {
      getProfile()
        .then((response) => {
          const data = response?.data;
          if (!data) {
            throw new Error('Invalid profile response');
          }
          setUser(data);
          localStorage.setItem('mytube_user', JSON.stringify(data));
        })
        .catch(() => {
          setUser(null);
          localStorage.removeItem('mytube_user');
          localStorage.removeItem('mytube_tokens');
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loginUser = useCallback((userData, tokenData) => {
    setUser(userData);
    localStorage.setItem('mytube_user', JSON.stringify(userData));
    localStorage.setItem('mytube_tokens', JSON.stringify(tokenData));
  }, []);

  const logoutUser = useCallback(() => {
    setUser(null);
    localStorage.removeItem('mytube_user');
    localStorage.removeItem('mytube_tokens');
  }, []);

  return (
    <AuthContext.Provider value={{ user, setUser, loading, loginUser, logoutUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
