import { apiFetch } from "@/lib/api";
import WidgetClient from "./WidgetClient.js"
export default async function WidgetPage({ searchParams }) {
    const { contextKey, appUid, appId } = await searchParams;
    const {user, contextNonce} = await apiFetch(`/users/byContextKey?contextKey=${contextKey}`)
    console.log(user, contextNonce)
    return (
        <div>
            <h1>Customer Order widget</h1>

            {/* Условный рендер по параметру */}
            {appId && <p>{appId}</p>}
            {appUid && <p>{appUid}</p>}
            {JSON.stringify(user)}
            {/* Данные, полученные с учётом query-параметра */}
            {/* {order && <pre>{JSON.stringify(order, null, 2)}</pre>} */}
            <WidgetClient 
                appUid={appUid}
                appId={appId}
                contextNonce={contextNonce}
            />
        </div>
    );
}