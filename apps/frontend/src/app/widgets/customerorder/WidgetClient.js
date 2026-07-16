"use client";

import { useEffect, useRef, useState } from "react";
import WidgetSDK from "@moysklad/js-widget-sdk";

// МойСклад кэширует и переиспользует iframe виджета в рамках одной вкладки браузера,
// поэтому при навигации между заказами наш скрипт продолжает работать и просто
// получает новое сообщение Open. Но при полной перезагрузке страницы iframe создаётся
// заново, и хост может отправить Open раньше, чем React успеет смонтироваться и
// подписаться на событие внутри useEffect (SSR/гидратация занимают время). Чтобы не
// пропустить это сообщение, создаём SDK и подписываемся на onOpen сразу при загрузке
// модуля, а не внутри useEffect, и буферизуем последнее сообщение.
const sdk = typeof window !== "undefined" ? WidgetSDK.create() : null;

let lastOpenMessage = null;
let openMessageWaiters = [];

if (sdk) {
    sdk.onOpen((message) => {
        lastOpenMessage = message;
        const waiters = openMessageWaiters;
        openMessageWaiters = [];
        waiters.forEach((resolve) => resolve(message));
    });
}

function waitForOpenMessage() {
    if (lastOpenMessage) {
        return Promise.resolve(lastOpenMessage);
    }
    return new Promise((resolve) => openMessageWaiters.push(resolve));
}

export default function WidgetClient({ appUid, appId, contextNonce, states, user, attributes }) {
    const [initialOrderState, setInitialOrderState] = useState(null);
    const initialOrderStateRef = useRef(null);

    useEffect(() => {
        if (!sdk) return;

        let cancelled = false;

        const fetchData = async (objectId) => {
            console.log('Fetching data for objectId:', objectId);
            const response = await fetch(`https://calc.askell.ru/api/backend/proxy/sklad?contextNonce=${contextNonce}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/e65e442d-d19c-11f0-0a80-0390000360cd`,
                    // url: `https://api.moysklad.ru/api/remap/1.2/entity/customerorder/${objectId}`,
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

        waitForOpenMessage().then(async ({ messageId, objectId }) => {
            if (cancelled) return;
            await fetchData(objectId);
            sdk.openFeedback(messageId);
        });

        sdk.onChange(({ changeHints, extensionPoint, name, objectState }) => {
            console.log('objectState', objectState);
            console.log('initialOrderStateRef.current', initialOrderStateRef.current);
            const initial = initialOrderStateRef.current;
            if (!initial) {
                sdk.validationFeedback(true);
                return;
            }
            if (initial.deliveryPlannedMoment > objectState.deliveryPlannedMoment /*&& user.permissions.admin.view != 'ALL'*/) {
                sdk.validationFeedback(false, `Только администратор может уменьшать дату доставки.`);
                return;
            }
            if(objectState.state.meta.href == /*states.customerorder['Поставлено в производство'].meta.href*/ "https://api.moysklad.ru/api/remap/1.2/entity/customerorder/metadata/states/4a0f6ccf-8132-11f1-0a80-13c5000001cf") {
                const attrs = (objectState.attributes || []).reduce((acc, x) => {
                    acc[x.name] = x.value
                    return acc
                }, {})
                if(!attrs['Вид доставки']){
                    sdk.validationFeedback(false, `Не заполнено обязательное поле "Вид доставки" для создания ПЗ.`);
                    return
                }
                if (attrs['Вид доставки']?.name !== 'Самовывоз') {
                    const required = ['Город получателя', 'Вид доставки', 'Телефон получателя', 'Адрес получателя', 'Выбор транспортной компании']
                    const missing = required.filter(key => !(attrs || {})[key])
                    if (missing.length > 0) {
                        sdk.validationFeedback(false, `Вид доставки не "Самовывоз". Заполнены не все обязательные поля для создания ПЗ.`);
                        return
                    }
                }
            }
            sdk.validationFeedback(true);
        });

        return () => {
            cancelled = true;
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