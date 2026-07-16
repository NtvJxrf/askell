import { apiFetch } from "@/lib/api";
import WidgetClient from "./WidgetClient.js"
export default async function WidgetPage({ searchParams }) {
    const { contextKey, appUid, appId } = await searchParams;
    const {user, contextNonce} = await apiFetch(`/users/byContextKey?contextKey=${contextKey}`)
    const states = await apiFetch(`/data-refresher/entity?entity=states&devToken=${process.env.DEV_TOKEN}`)
    return (
        <div>
            <WidgetClient 
                appUid={appUid}
                appId={appId}
                contextNonce={contextNonce}
                states={states}
                user={user}
            />
        </div>
    );
}