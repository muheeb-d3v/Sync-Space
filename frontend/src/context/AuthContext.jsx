import { createContext, useEffect, useState } from 'react';

const AuthContext = createContext();

export const AuthContextProvider = ({ children }) => {

    const [auth, setAuth] = useState({
        user: null,
        token: null,
        isLoading: true
    });

    useEffect(() => {
        const storedUser = localStorage.getItem('user');
        const token = localStorage.getItem('token');

        if (storedUser && token) {
            let user = null;
            try {
                user = JSON.parse(storedUser);
            } catch {
                user = null;
            }

            if (!user) {
                localStorage.removeItem('user');
                localStorage.removeItem('token');
                setAuth({
                    user: null,
                    token: null,
                    isLoading: false
                });
                return;
            }

            // Older sessions stored the password hash in localStorage.
            if (user.password) {
                delete user.password;
                localStorage.setItem('user', JSON.stringify(user));
            }

            setAuth({
                user,
                token,
                isLoading: false
            });
        } else {
            setAuth({
                user: null,
                token: null,
                isLoading: false
            });
        }
    } , []);

    async function logout() {
        localStorage.removeItem('user');
        localStorage.removeItem('token');
        setAuth({
            user: null,
            token: null,
            isLoading: false
        });
    }

    return (
        <AuthContext.Provider value={{ auth, setAuth, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export default AuthContext;