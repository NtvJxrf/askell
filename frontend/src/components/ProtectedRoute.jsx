import { Navigate } from "react-router-dom";
import store from '../store.js'
import ForbiddenPage from "../pages/ForbiddenPage.jsx";
const ProtectedRoute = ({ children, requiredRoles }) => {
    const user = store.getState().user.user
    if (!user) return <Navigate to="/login" replace />

    if(user.roles.includes('admin') || user.roles.includes('system')) return children
    const hasAccess = requiredRoles.some(role => user.roles.includes(role))
    if (requiredRoles && !hasAccess)
        return <ForbiddenPage />

    return children
};

export default ProtectedRoute;