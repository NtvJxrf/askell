"use client";

import { useEffect } from "react";
import WidgetSDK from "@moysklad/js-widget-sdk";

export default function WidgetClient({ appUid, appId, contextNonce }) {

    useEffect(() => {
        const sdk = WidgetSDK.create();

        sdk.onOpen((message) => {
            console.log("Open", message);
        });
        const fetchData = async () => {
            const response = await fetch(`https://calc.askell.ru/api/backend/proxy/sklad`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/e65e442d-d19c-11f0-0a80-0390000360cd`,
                    contextNonce
                })
            });
            if (!response.ok) {
                console.error("Error fetching data:", response.statusText);
                return;
            }
            const data = await response.json();
            console.log("Data received from backend proxy:", data);
        };
        setTimeout(fetchData, 3000); // Delay the fetch by 1 second
        return () => {
            // если SDK имеет destroy/unsubscribe
            // sdk.destroy();
        };
    }, []);

    return null;
}