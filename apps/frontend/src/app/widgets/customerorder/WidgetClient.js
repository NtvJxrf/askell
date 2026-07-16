"use client";

import { useEffect, useState } from "react";
import WidgetSDK from "@moysklad/js-widget-sdk";

export default function WidgetClient({ appUid, appId, contextNonce, states }) {
    const [initialOrderState, setInitialOrderState] = useState(null);
    useEffect(() => {
        const sdk = WidgetSDK.create();
        const fetchData = async () => {
            const response = await fetch(`https://calc.askell.ru/api/backend/proxy/sklad?contextNonce=${contextNonce}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/e65e442d-d19c-11f0-0a80-0390000360cd`,
                })
            });
            if (!response.ok) {
                console.error("Error fetching data:", response.statusText);
                return;
            }
            const data = await response.json();
            console.log("Data received from backend proxy:", data);
            setInitialOrderState(data);
        };
        sdk.onOpen(async (message) => {
            await fetchData();
            sdk.openFeedback(message ? message.messageId : undefined);
        });
        return () => {
            // если SDK имеет destroy/unsubscribe
            // sdk.destroy();
        };
    }, []);

    return (
        <div>
            <h2>Widget Client</h2>
            <p>App UID: {appUid}</p>
            <p>App ID: {appId}</p>
            <p>Context Nonce: {contextNonce}</p>
            <p>Initial Order State: {initialOrderState ? initialOrderState.state.meta.href : "Loading..."}</p>
            <p>States: {states ? JSON.stringify(states) : "Loading..."}</p>
        </div>
    );
}