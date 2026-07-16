"use client";

import { useEffect, useRef, useState } from "react";
import WidgetSDK from "@moysklad/js-widget-sdk";

export default function WidgetClient({ appUid, appId, contextNonce, states, user }) {
    const [initialOrderState, setInitialOrderState] = useState(null);
    const initialOrderStateRef = useRef(null);

    useEffect(() => {
        const sdk = WidgetSDK.create();

        const fetchData = async () => {
            const response = await fetch(`https://calc.askell.ru/api/backend/proxy/sklad?contextNonce=${contextNonce}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/e65e442d-d19c-11f0-0a80-0390000360cd`,
                    priority: true
                })
            });
            if (!response.ok) {
                console.error("Error fetching data:", response.statusText);
                return;
            }
            const data = await response.json();
            console.log("Data received from backend proxy:", data);
            console.log('user', user)
            initialOrderStateRef.current = data;
            setInitialOrderState(data);
        };

        sdk.onOpen(async (message) => {
            await fetchData();
            sdk.openFeedback(message ? message.messageId : undefined);
        });

        sdk.onChange(({ changeHints, extensionPoint, name, objectState }) => {
            const initial = initialOrderStateRef.current;
            console.log('objectState', objectState)
            console.log('initialOrderState', initial)
            if (!initial) {
                sdk.validationFeedback(true, 'messageText');
                return;
            }
            if (initial.deliveryPlannedMoment > objectState.deliveryPlannedMoment) {
                sdk.validationFeedback(false, 'Дата отгрузки меньше изначальной');
                return;
            }
            sdk.validationFeedback(true, 'messageText');
        });

        return () => {
            sdk.destroy();
        };
    }, [contextNonce]);

    return (
        <div className="h-full w-full max-h-screen max-w-full overflow-auto">
            <div className="flex flex-col gap-2 p-4 text-sm min-w-max">
                <h2 className="text-lg font-semibold">Widget Client</h2>
                <p className="text-muted-foreground">App UID: <span className="font-medium text-foreground">{appUid}</span></p>
                <p className="text-muted-foreground">App ID: <span className="font-medium text-foreground">{appId}</span></p>
                <p className="text-muted-foreground">Context Nonce: <span className="font-medium text-foreground">{contextNonce}</span></p>
                <p className="text-muted-foreground">
                    Initial Order State: <span className="font-medium text-foreground">{initialOrderState ? initialOrderState.state.meta.href : "Loading..."}</span>
                </p>
                <p className="text-muted-foreground">
                    States: <span className="font-medium text-foreground">{states ? JSON.stringify(states?.customerorder) : "Loading..."}</span>
                </p>
            </div>
        </div>
    );
}