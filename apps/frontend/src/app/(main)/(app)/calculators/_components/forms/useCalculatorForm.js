'use client';
import { useForm } from "react-hook-form"
import { useDispatch } from "react-redux"
import { useEffect } from "react"
import { store, setFormValues } from "@/lib/slice"

// Wraps react-hook-form's useForm and transparently persists/restores the
// form's values in redux (state.app.forms[formId]) so they survive switching
// between calculator tabs and pages. Persisted state lives only for the
// current session (plain redux, no storage).
//
// When `dv` (initial values coming from an existing position being edited)
// is provided, persistence is skipped entirely: the form should reflect the
// edited position, not the in-progress draft, and shouldn't overwrite it.
export default function useCalculatorForm(formId, { defaultValues, dv, ...rest } = {}) {
    const dispatch = useDispatch()
    const isEditing = dv != null
    const persistedValues = isEditing ? null : store.getState().app?.forms?.[formId]?.values

    const form = useForm({
        ...rest,
        defaultValues: {
            ...defaultValues,
            ...persistedValues,
            ...dv,
        }
    })

    useEffect(() => {
        if (isEditing) return
        const subscription = form.watch((values) => {
            dispatch(setFormValues({ id: formId, values }))
        })
        return () => subscription.unsubscribe()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // Resets the form back to its blank defaults (ignoring any persisted
    // draft) and clears the persisted draft in redux, so the blank state
    // sticks even if the form is unmounted/remounted afterwards.
    form.resetToBlank = () => {
        form.reset(defaultValues)
        if (!isEditing) dispatch(setFormValues({ id: formId, values: defaultValues }))
    }

    return form
}

// Reads persisted metadata for a form (e.g. count of dynamically added
// material fields) so it can be restored on remount. Returns undefined when
// editing an existing position, since that shouldn't touch the draft state.
export function getPersistedFormMeta(formId, isEditing = false) {
    if (isEditing) return undefined
    return store.getState().app?.forms?.[formId]?.meta
}
