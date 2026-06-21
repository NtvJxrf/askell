'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Button } from '@/components/Button';

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);

  async function onSubmit(event) {
    event.preventDefault();
    setError('');
    setPending(true);

    const form = new FormData(event.currentTarget);
    const res = await signIn('credentials', {
      username: form.get('username'),
      password: form.get('password'),
      redirect: false,
    });

    setPending(false);

    if (res?.error) {
      setError('Неверный логин или пароль');
      return;
    }
    router.push('/');
    router.refresh();
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 p-4 dark:bg-black">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm space-y-5 rounded-2xl border border-black/[.08] bg-white p-8 shadow-sm dark:border-white/[.145] dark:bg-zinc-950"
      >
        <div className="space-y-1">
          <h1 className="text-xl font-semibold tracking-tight text-black dark:text-zinc-50">
            Вход
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Введите логин и пароль
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-medium">
            Логин
          </label>
          <input
            id="username"
            name="username"
            autoComplete="username"
            required
            className="w-full rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/[.18] dark:focus:border-white"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            Пароль
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            className="w-full rounded-lg border border-black/[.12] bg-transparent px-3 py-2 text-sm outline-none focus:border-black dark:border-white/[.18] dark:focus:border-white"
          />
        </div>

        {error && (
          <p className="text-sm text-red-600 dark:text-red-400" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" variant="primary" disabled={pending} className="w-full py-2">
          {pending ? 'Вход…' : 'Войти'}
        </Button>
      </form>
    </div>
  );
}
