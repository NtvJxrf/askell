import { backend } from "@lib/backend"
export default async function WidgetPage({ searchParams }) {
    // Начиная с Next 15+ searchParams — это Promise, его нужно await'ить
    const { contextKey, appUid, appId } = await searchParams;
    console.log(contextKey, appUid, appId);
    const user = await backend(`/users/byContextKey/${contextKey}`)
    // Условный запрос к бэкенду в зависимости от параметра
    // const order = orderId ? await apiFetch(`/orders/${orderId}`) : null;

    return (
        <div>
            <h1>Customer Order widget</h1>

            {/* Условный рендер по параметру */}
            {appId && <p>{appId}</p>}
            {appUid && <p>{appUid}</p>}
            {JSON.stringify(user)}
            {/* Данные, полученные с учётом query-параметра */}
            {/* {order && <pre>{JSON.stringify(order, null, 2)}</pre>} */}
        </div>
    );
}