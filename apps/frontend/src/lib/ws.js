'use client';
import { useEffect, useRef } from "react";
import { useDispatch } from "react-redux";
import { setSelfcost, setHeaps, setSettings, setSchedule } from "@/lib/slice";
export default function WebSocketHandler() {
    const dispatch = useDispatch();
    const wsRef = useRef(null);
    const reconnectTimeoutRef = useRef(null);

    useEffect(() => {
        const connect = () => {
            const ws = new WebSocket(process.env.WS_URL || "ws://localhost:8080");
            wsRef.current = ws;

            ws.onopen = () => {
                if (reconnectTimeoutRef.current) {
                    clearTimeout(reconnectTimeoutRef.current);
                    reconnectTimeoutRef.current = null;
                }
                console.log("✅ WebSocket подключен");
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                console.log("Получены данные по WebSocket:", data);
                switch (data.type) {
                    case "selfcost":
                    case "selfcosts":
                        dispatch(setSelfcost(data.selfcost));
                    break;
                    case "productionData":
                    break;
                    case "heaps":
                        dispatch(setHeaps(data.heaps));
                    break;
                    case "settings":
                        dispatch(setSettings(data.settings));
                    break;
                    case "schedule":
                        dispatch(setSchedule(data.schedule));
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

        connect();

        return () => {
            if (wsRef.current) wsRef.current.close();
            if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        };
    }, [dispatch]);

    return null; // компонент ничего не рендерит
}
