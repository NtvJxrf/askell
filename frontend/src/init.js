import { setSelfcost } from './slices/selfcostSlice.js'
import axios from "axios";
import { setIsAuth, setUser, setVersion } from './slices/userSlice.js';
import { setProductionLoad } from './slices/positionsSlice.js'
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
            dispatch(setVersion(response.data.version))
        } catch (error) {
            console.error("Ошибка при проверке авторизации:", error);
            dispatch(setIsAuth(false));
        } finally {
            setLoading(false);
        }
    };
    static async getProductionLoad(dispatch){
        try {
            const res = await axios.get(`${import.meta.env.VITE_API_URL}/api/sklad/ordersInWork`, { withCredentials: true });
            dispatch(setProductionLoad(res.data || { kriv: [], pryam: [], other: [], straightTotal: 0, curvedTotal: 0, drillsTotal: 0, cuttingTotal: 0, temperingTotal: 0, triplexTotal: 0, viz: 0, selk: 0}))
            console.log(res)
        } catch (err) {
            console.error("Ошибка при загрузке данных:", err);
            dispatch(setProductionLoad({ kriv: [], pryam: [], other: [], straightTotal: 0, curvedTotal: 0, drillsTotal: 0, cuttingTotal: 0, temperingTotal: 0, triplexTotal: 0, viz: 0, selk: 0 }))
        }
    };
}