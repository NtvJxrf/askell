import { setSelfcost } from './slices/selfcostSlice.js'
import axios from "axios";
import { setIsAuth, setUser } from './slices/userSlice.js';
export default class Init{
    static async getSelfcost(dispatch){
            try{
                const selfcostResponse = await axios.get(`${import.meta.env.VITE_API_URL}/api/sklad/getSelfcost`, { withCredentials: true })
                dispatch(setSelfcost(selfcostResponse.data))
            }catch (err) {
                console.error('Ошибка при получении себестоимости:', err);
            }
    }
    static async checkAuth(dispatch, setLoading){
            try {
                const response = await axios.get(`${import.meta.env.VITE_API_URL}/api/isAuthenticated`, { withCredentials: true })
                dispatch(setIsAuth(response.data.auth === true))
                dispatch(setUser(response.data.user))
            } catch (error) {
                console.error("Ошибка при проверке авторизации:", error);
                dispatch(setIsAuth(false));
            } finally {
             setLoading(false);
            }
        };
}