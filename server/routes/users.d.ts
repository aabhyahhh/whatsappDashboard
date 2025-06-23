declare const router: import("express-serve-static-core").Router;
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                username: string;
                role: string;
            };
        }
    }
}
export default router;
