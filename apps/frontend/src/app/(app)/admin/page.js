'use client'
import { backend } from "@/lib/backend";
import { useState, useEffect } from "react";
export default function AdminPage() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    const fetchUsers = async () => {
      const res = await backend('/users');
      setUsers(res);
    };
    fetchUsers();
  }, []);
  console.log(users)
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold tracking-tight">Админка</h1>
      <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
        Здесь будет админка.
      </p>
    </div>
  );
}
