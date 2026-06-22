"use client"

import RenderField from './RenderField.js';
import { Controller, useForm } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ComboBox } from "@/components/ui/combobox";
export default function GlassForm() {
    const { register, handleSubmit, formState: { errors } } = useForm(
    {
        defaultValues: {

        },
    });

    const onSubmit = (data) => {
        console.log(data);
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
        <div>
            <Input
            {...register("name", {
                required: "Введите имя",
                minLength: {
                value: 2,
                message: "Минимум 2 символа",
                },
            })}
            placeholder="Имя"
            />

            {errors.name && (
            <p>{errors.name.message}</p>
            )}
        </div>

        <div>
            <Input
            {...register("email", {
                required: "Введите email",
                pattern: {
                value: /^\S+@\S+$/i,
                message: "Некорректный email",
                },
            })}
            placeholder="Email"
            />

            {errors.email && (
            <p>{errors.email.message}</p>
            )}
        </div>

        <button type="submit">
            Отправить
        </button>
        </form>
    );
}