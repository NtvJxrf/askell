'use client'
import { useEffect } from "react";
import { useDispatch } from 'react-redux';
import { backend } from "@/lib/backend";
import { setSelfcost, setSchedule, setHeaps, setUser, setSettings } from "@/lib/slice";
export default function Init() {
    const dispatch = useDispatch();
    useEffect(() => {
        const fetchData = async () => {
            const selfcost = await backend('/data-refresher/selfcost');
            const heaps = await backend('/data-refresher/getHeaps');
            const schedule = await backend('/data-refresher/getSchedule');
            const user = await backend('/me');
            const settings = await backend('/data-refresher/getSettings');
            console.log(selfcost)
            dispatch(setSettings(settings));
            dispatch(setHeaps(heaps));
            dispatch(setSchedule(schedule));
            dispatch(setSelfcost(selfcost));
            dispatch(setUser(user));
        }
        fetchData();
    }, [dispatch])
    return null
}