export async function requireWorkspaceAdmin(req, _res, next) {
    try {
        const user = req.authUser;

        if (!user || user.role !== "admin") {
            const error = new Error("Workspace administrator access is required");
            error.status = 403;
            return next(error);
        }

        req.currentUser = user;
        return next();
    } catch (error) {
        return next(error);
    }
}
