import React, {createContext, useContext, useEffect, useState} from 'react';

type User = { id: string; email: string };
type AuthCtx = {
  user: User | null;
  signup: (email: string, password: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
};
const Ctx = createContext<AuthCtx|null>(null);

const USERS_KEY = 'SS_USERS'; // map: email -> { id, email, passwordHash, plan, selectedSport }

const hash = (s: string) => btoa(unescape(encodeURIComponent(s))); // simple mock hash

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({children}) => {
  const [user, setUser] = useState<User|null>(null);

  useEffect(() => {
    const sid = localStorage.getItem('SS_SESSION_ID');
    const email = localStorage.getItem('SS_SESSION_EMAIL');
    if (sid && email) setUser({ id: sid, email });
  }, []);

  const getUsers = () => JSON.parse(localStorage.getItem(USERS_KEY) || '{}');
  const setUsers = (u: any) => localStorage.setItem(USERS_KEY, JSON.stringify(u));

  const signup = async (email: string, password: string) => {
    const users = getUsers();
    if (users[email]) throw new Error('Account already exists');
    const id = crypto.randomUUID();
    users[email] = {
      id, email,
      passwordHash: hash(password),
      plan: 'demo',
      selectedSport: null
    };
    setUsers(users);
    localStorage.setItem('SS_SESSION_ID', id);
    localStorage.setItem('SS_SESSION_EMAIL', email);
    setUser({ id, email });
  };

  const login = async (email: string, password: string) => {
    const users = getUsers();
    const rec = users[email];
    if (!rec || rec.passwordHash !== hash(password)) throw new Error('Invalid credentials');
    localStorage.setItem('SS_SESSION_ID', rec.id);
    localStorage.setItem('SS_SESSION_EMAIL', email);
    setUser({ id: rec.id, email });
  };

  const logout = () => {
    localStorage.removeItem('SS_SESSION_ID');
    localStorage.removeItem('SS_SESSION_EMAIL');
    setUser(null);
  };

  return <Ctx.Provider value={{ user, signup, login, logout }}>{children}</Ctx.Provider>;
};

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used within AuthProvider');
  return c;
};
