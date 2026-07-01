'use client';
import { useRef, useState } from 'react';
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

export default function CreateUserDialog({ open, onOpenChange, onCreated }) {
  const usernameRef = useRef(null);
  const fullnameRef = useRef(null);
  const anchorRef = useComboboxAnchor();
  const [roles, setRoles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState(null);

  const handleOpenChange = (next) => {
    if (!next) {
      // Reset once the dialog finishes closing so the next open starts clean.
      if (usernameRef.current) usernameRef.current.value = '';
      if (fullnameRef.current) fullnameRef.current.value = '';
      setRoles([]);
      setCreated(null);
    }
    onOpenChange(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const username = (usernameRef.current?.value ?? '').trim();
    const fullname = (fullnameRef.current?.value ?? '').trim();

    if (!username || !fullname) {
      toast.error('Заполните логин и ФИО');
      return;
    }

    setSubmitting(true);
    const password = generatePassword();
    try {
      const newUser = await backend('/users', {
        method: 'POST',
        body: { username, fullname, password, roles },
      });
      setCreated({ username, password });
      onCreated?.(newUser);
    } catch (err) {
      toast.error(err.message || 'Не удалось создать пользователя');
    } finally {
      setSubmitting(false);
    }
  };

  const copyCredentials = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(
        `Логин: ${created.username}\nПароль: ${created.password}`
      );
      toast.success('Скопировано');
    } catch {
      toast.error('Не удалось скопировать');
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        {created ? (
          <>
            <DialogHeader>
              <DialogTitle>Пользователь создан</DialogTitle>
              <DialogDescription>
                Передайте эти данные пользователю — пароль больше нигде не
                отображается.
              </DialogDescription>
            </DialogHeader>
            <Separator />
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Логин:</span>
                <span className="font-medium">{created.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Пароль:</span>
                <span className="font-mono font-medium">{created.password}</span>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={copyCredentials}>
                Скопировать
              </Button>
              <Button type="button" onClick={() => handleOpenChange(false)}>
                Готово
              </Button>
            </DialogFooter>
          </>
        ) : (
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Новый пользователь</DialogTitle>
              <DialogDescription>
                Пароль будет сгенерирован автоматически (8 цифр).
              </DialogDescription>
            </DialogHeader>
            <Separator className="my-4" />
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="create-username">Логин</Label>
                <Input id="create-username" ref={usernameRef} autoComplete="off" required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="create-fullname">ФИО</Label>
                <Input id="create-fullname" ref={fullnameRef} autoComplete="off" required />
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
            </div>
            <DialogFooter className="mt-4">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Создание…' : 'Создать'}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
