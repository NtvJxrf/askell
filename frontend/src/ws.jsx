import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { setSelfcost } from "./slices/selfcostSlice";
import { setProductionLoad } from "./slices/positionsSlice";

export default function WebSocketHandler() {
    const dispatch = useDispatch();
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    const connect = () => {
        const ws = new WebSocket(import.meta.env.VITE_WSS_DOMAIN);
        wsRef.current = ws;

        ws.onopen = () => {
            console.log("✅ WebSocket открыт");
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
                reconnectTimeoutRef.current = null;
            }
        };

        ws.onmessage = (event) => {
            const data = JSON.parse(event.data);
            console.log("📩 Обновление от сервера:", data);

            switch (data.type) {
                case "selfcosts":
                    dispatch(setSelfcost(data.data));
                    break;
                case "ordersInWork":
                    dispatch(setProductionLoad(data.data || {
                        kriv: [],
                        pryam: [],
                        other: [],
                        straightTotal: 0,
                        curvedTotal: 0,
                        drillsTotal: 0,
                        cuttingTotal: 0,
                        temperingTotal: 0,
                        triplexTotal: 0,
                        viz: 0,
                        selk: 0
                    }));
                    break;
            }
        };

        const scheduleReconnect = () => {
            if (!reconnectTimeoutRef.current) {
                console.warn("🔄 Попытка переподключения через 3 сек...");
                reconnectTimeoutRef.current = setTimeout(connect, 3000);
            }
        };

        ws.onerror = (e) => {
            console.error("❌ WebSocket ошибка", e);
            scheduleReconnect();
        };

        ws.onclose = () => {
            console.warn("⚠️ WebSocket закрыт");
            scheduleReconnect();
        };
    };

    useEffect(() => {
        connect();

        return () => {
            if (wsRef.current) wsRef.current.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, [dispatch]);

    return null; // компонент ничего не рендерит
}
