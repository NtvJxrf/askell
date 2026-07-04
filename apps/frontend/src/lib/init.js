'use client'
import { useEffect } from "react";
import { useDispatch } from 'react-redux';
import { backend } from "@/lib/backend";
import { setSelfcost, setSchedule, setHeaps, setUser, setSettings } from "@/lib/slice";
export default function Init() {
    const dispatch = useDispatch();
    useEffect(() => {
        const fetchData = async () => {
            const [selfcost, heaps, schedule, user, settings] = await Promise.allSettled([
                backend('/data-refresher/selfcost'),
                backend('/data-refresher/getHeaps'),
                backend('/data-refresher/getSchedule'),
                backend('/me'),
                backend('/data-refresher/getSettings'),
            ]);

            if (settings.status === 'fulfilled') dispatch(setSettings(settings.value));
            else console.error('Failed to load settings:', settings.reason);

            if (heaps.status === 'fulfilled') dispatch(setHeaps(heaps.value));
            else console.error('Failed to load heaps:', heaps.reason);

            if (schedule.status === 'fulfilled') dispatch(setSchedule(schedule.value));
            else console.error('Failed to load schedule:', schedule.reason);

            if (selfcost.status === 'fulfilled') dispatch(setSelfcost(selfcost.value));
            else console.error('Failed to load selfcost:', selfcost.reason);

            if (user.status === 'fulfilled') dispatch(setUser(user.value));
            else console.error('Failed to load user:', user.reason);
        }
        fetchData();
    }, [dispatch])
    return null
}