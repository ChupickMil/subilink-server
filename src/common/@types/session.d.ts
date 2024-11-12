import 'express-session';

declare module 'express-session' {
    interface SessionData {
        SESSION_ID: string;
        isTwoFAAuthenticated?: boolean;
    }
}
