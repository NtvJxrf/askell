import { useEffect } from "react";
import { useDispatch } from "react-redux";
import { setSelfcost } from "./slices/selfcostSlice";
import { setProductionLoad } from './slices/positionsSlice'
export default function WebSocketHandler() {
    const dispatch = useDispatch();

    useEffect(() => {
        const ws = new WebSocket(import.meta.env.VITE_WSS_DOMAIN);

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("Обновление от сервера:", data);

            switch (data.type) {
                case "selfcosts":
                    dispatch(setSelfcost(data.data));
                    break;
                case "ordersInWork":
                    dispatch(setProductionLoad(data.data || { kriv: [], pryam: [], other: [], straightTotal: 0, curvedTotal: 0, drillsTotal: 0, cuttingTotal: 0, temperingTotal: 0, triplexTotal: 0, viz: 0, selk: 0}))
                    break;
            }
        };
        ws.onopen = () => console.log("WebSocket открыт");
        ws.onclose = () => console.log("WebSocket закрыт");
        ws.onerror = (e) => console.error("WebSocket ошибка", e);

        return () => {
            ws.close();
        };
    }, [dispatch]);

    return null; // этот компонент ничего не рендерит
}
