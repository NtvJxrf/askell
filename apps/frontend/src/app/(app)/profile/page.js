'use client'
import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { backend } from "@/lib/backend";
import { setUser } from "@/lib/slice";

export default function ProfilePage() {
  const user = useSelector((state) => state.app.user);
  const dispatch = useDispatch();

  const [username, setUsername] = useState(user?.username ?? "");
  const [savingUsername, setSavingUsername] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const handleSaveUsername = async (e) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed) {
      toast.error("Введите логин");
      return;
    }
    if (trimmed === user?.username) return;

    setSavingUsername(true);
    try {
      const updated = await backend("/me", {
        method: "PATCH",
        body: { username: trimmed },
      });
      dispatch(setUser(updated));
      toast.success("Логин изменён");
    } catch (err) {
      toast.error(err.message || "Не удалось изменить логин");
    } finally {
      setSavingUsername(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Введите текущий пароль");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Новый пароль должен быть не короче 6 символов");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Пароли не совпадают");
      return;
    }

    setSavingPassword(true);
    try {
      await backend("/me", {
        method: "PATCH",
        body: { password: newPassword, currentPassword },
      });
      toast.success("Пароль изменён");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.message || "Не удалось изменить пароль");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="max-w-2xl space-y-6 p-6">
      <h1 className="text-xl font-semibold tracking-tight">Профиль</h1>

      <Card>
        <CardHeader>
          <CardTitle>ФИО: {user?.fullname ?? "—"}</CardTitle>
          <CardDescription>Логин: {user?.username}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-center gap-2">
            <span className="shrink-0 text-sm text-muted-foreground">Роли:</span>
            {(user?.roles ?? []).length > 0 ? (
              user.roles.map((role) => (
                <Badge key={role} variant="secondary">{role}</Badge>
              ))
            ) : (
              <span className="text-sm text-muted-foreground">Нет назначенных ролей</span>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Изменить логин</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSaveUsername} className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Label htmlFor="username">Логин</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>
            <Button type="submit" disabled={savingUsername || username.trim() === user?.username}>
              Изменить логин
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Изменить пароль</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Текущий пароль</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="newPassword">Новый пароль</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Повторите новый пароль</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" disabled={savingPassword}>
              Сменить пароль
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}