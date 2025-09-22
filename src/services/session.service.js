// Simple in-memory session store
const sessions = new Map();

const createSession = (token, data) => {
    sessions.set(token, {
        ...data,
        createdAt: Date.now()
    });
};

const getSession = (token) => {
    const session = sessions.get(token);
    if (session) {
        // Check if session is still valid (24 hours)
        const age = Date.now() - session.createdAt;
        if (age > 24 * 60 * 60 * 1000) {
            sessions.delete(token);
            return null;
        }
        return session;
    }
    return null;
};

const deleteSession = (token) => {
    sessions.delete(token);
};

module.exports = {
    createSession,
    getSession,
    deleteSession
};