'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Combobox,
  ComboboxChips,
  ComboboxChip,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxList,
  ComboboxItem,
  ComboboxValue,
  ComboboxEmpty,
  useComboboxAnchor,
} from '@/components/ui/combobox';
import { toast } from 'sonner';
import { backend } from '@/lib/backend';
import { ALL_ROLES } from '@askell/shared/roles';

const ROLE_LABELS = {
  admin: 'Администратор',
  manager: 'Менеджер',
  production: 'Производство',
  user: 'Пользователь',
};

const roleLabel = (role) => ROLE_LABELS[role] || role;

// Generates a random 8-digit numeric password (cryptographically random when
// available in the browser).
function generatePassword() {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint32Array(8);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b % 10).join('');
  }
  let pwd = '';
  for (let i = 0; i < 8; i++) pwd += Math.floor(Math.random() * 10);
  return pwd;
}

export default function UserDetailsDialog({ user, open, onOpenChange, onUpdated, onDeleted }) {
  const usernameRef = useRef(null);
  const fullnameRef = useRef(null);
  const anchorRef = useComboboxAnchor();
  const [roles, setRoles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [newPassword, setNewPassword] = useState(null);

  useEffect(() => {
    if (open && user) {
      if (usernameRef.current) usernameRef.current.value = user.username;
      if (fullnameRef.current) fullnameRef.current.value = user.fullname;
      setRoles(user.roles ?? []);
      setNewPassword(null);
    }
  }, [open, user]);

  const handleSave = async () => {
    const username = (usernameRef.current?.value ?? '').trim();
    const fullname = (fullnameRef.current?.value ?? '').trim();

    if (!username || !fullname) {
      toast.error('Заполните логин и ФИО');
      return;
    }

    setSaving(true);
    try {
      const updated = await backend(`/users/${user.id}`, {
        method: 'PATCH',
        body: { username, fullname, roles },
      });
      toast.success('Изменения сохранены');
      onUpdated?.(updated);
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || 'Не удалось сохранить изменения');
    } finally {
      setSaving(false);
    }
  };

  const handleResetPassword = async () => {
    setResetting(true);
    const password = generatePassword();
    try {
      const updated = await backend(`/users/${user.id}`, {
        method: 'PATCH',
        body: { password },
      });
      setNewPassword(password);
      onUpdated?.(updated);
      toast.success('Пароль сброшен');
    } catch (err) {
      toast.error(err.message || 'Не удалось сбросить пароль');
    } finally {
      setResetting(false);
    }
  };

  const copyPassword = async () => {
    if (!newPassword) return;
    try {
      await navigator.clipboard.writeText(newPassword);
      toast.success('Скопировано');
    } catch {
      toast.error('Не удалось скопировать');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Удалить пользователя «${user.username}»? Это действие необратимо.`)) {
      return;
    }

    setDeleting(true);
    try {
      await backend(`/users/${user.id}`, { method: 'DELETE' });
      toast.success('Пользователь удалён');
      onDeleted?.(user.id);
      onOpenChange(false);
    } catch (err) {
      toast.error(err.message || 'Не удалось удалить пользователя');
    } finally {
      setDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{user.fullname}</DialogTitle>
          <DialogDescription>
            Создан: {new Date(user.createdAt).toLocaleString('ru-RU')}
          </DialogDescription>
        </DialogHeader>
        <Separator />
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="edit-username">Логин</Label>
            <Input id="edit-username" ref={usernameRef} autoComplete="off" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="edit-fullname">ФИО</Label>
            <Input id="edit-fullname" ref={fullnameRef} autoComplete="off" />
          </div>

          <div className="space-y-2">
            <Label>Роли</Label>
            <Combobox items={ALL_ROLES} multiple value={roles} onValueChange={setRoles}>
              <ComboboxChips ref={anchorRef} className="w-full">
                <ComboboxValue>
                  {(selected) =>
                    selected.map((role) => (
                      <ComboboxChip key={role} aria-label={roleLabel(role)}>
                        {roleLabel(role)}
                      </ComboboxChip>
                    ))
                  }
                </ComboboxValue>
                <ComboboxChipsInput placeholder={roles.length ? '' : 'Выберите роли...'} />
              </ComboboxChips>
              <ComboboxContent anchor={anchorRef}>
                <ComboboxEmpty>Ничего не найдено</ComboboxEmpty>
                <ComboboxList>
                  {(role) => (
                    <ComboboxItem key={role} value={role}>
                      {roleLabel(role)}
                    </ComboboxItem>
                  )}
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
          </div>

          {newPassword && (
            <div className="rounded-lg bg-muted p-3 text-sm">
              <div className="text-muted-foreground">Новый пароль:</div>
              <div className="flex items-center justify-between">
                <span className="font-mono font-medium">{newPassword}</span>
                <Button
                  type="button"
                  size="xs"
                  variant="outline"
                  onClick={copyPassword}
                >
                  Скопировать
                </Button>
              </div>
            </div>
          )}
        </div>
        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            variant="destructive"
            disabled={deleting}
            onClick={handleDelete}
          >
            {deleting ? 'Удаление…' : 'Удалить'}
          </Button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              disabled={resetting}
              onClick={handleResetPassword}
            >
              {resetting ? 'Сброс…' : 'Сбросить пароль'}
            </Button>
            <Button type="button" disabled={saving} onClick={handleSave}>
              {saving ? 'Сохранение…' : 'Сохранить'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
