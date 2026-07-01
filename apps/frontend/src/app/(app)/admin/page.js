'use client'
import { backend } from "@/lib/backend";
import { useState, useEffect, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { PERMISSIONS } from "@askell/shared/permissions";
import {
  Combobox,
  ComboboxChip,
  ComboboxChips,
  ComboboxChipsInput,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxItem,
  ComboboxList,
  ComboboxValue,
  useComboboxAnchor,
} from "@/components/ui/combobox"
import { Input } from "@/components/ui/input"
export default function AdminPage() {
  const [users, setUsers] = useState([]);
  useEffect(() => {
    const fetchUsers = async () => {
      const res = await backend('/users');
      setUsers(res);
    };
    fetchUsers();
  }, []);
  const [ selectedUser, setSelectedUser] = useState(null);
  const anchor = useComboboxAnchor()
  const usernameRef = useRef(null);
  const fullnameRef = useRef(null);
  const [disabled, setDisabled] = useState(false);
  const [newPassword, setNewPassword] = useState(null);
  const [roles, setRoles] = useState([]);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (selectedUser) {
      setRoles(selectedUser.roles ?? []);
      setNewPassword(null);
    }
  }, [selectedUser]);
  const handleSave = async () => {
    const username = (usernameRef.current?.value ?? '').trim();
    const fullname = (fullnameRef.current?.value ?? '').trim();

    if (!username || !fullname) {
      toast.error('Заполните логин и ФИО');
      return;
    }

    setDisabled(true);
    try {
      const updated = await backend(`/users/${selectedUser.id}`, {
        method: 'PATCH',
        body: { username, fullname, roles },
      });
      toast.success('Изменения сохранены');
      setSelectedUser(null);
    } catch (err) {
      toast.error(err.message || 'Не удалось сохранить изменения');
    } finally {
      setDisabled(false);
    }
  };
  const handleDelete = async () => {
    if (!window.confirm(`Удалить пользователя «${selectedUser?.username}»? Это действие необратимо.`)) {
      return;
    }

    setDisabled(true);
    try {
      await backend(`/users/${selectedUser.id}`, { method: 'DELETE' });
      setUsers(users.filter(u => u.id !== selectedUser.id));
      toast.success('Пользователь удалён');
      setSelectedUser(null);
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Не удалось удалить пользователя');
    } finally {
      setDisabled(false);
    }
  }
  const handleResetPassword = async () => {
    setDisabled(true);
    const password = generatePassword();
    try {
      const updated = await backend(`/users/${selectedUser.id}`, {
        method: 'PATCH',
        body: { password },
      });
      setNewPassword(password);
      toast.success('Пароль сброшен');
    } catch (err) {
      toast.error(err.message || 'Не удалось сбросить пароль');
    } finally {
      setDisabled(false);
    }
  }
  const handleCreateUser = async () => {
    const username = (usernameRef.current?.value ?? '').trim();
    const fullname = (fullnameRef.current?.value ?? '').trim();
    if (!username || !fullname) {
      toast.error('Заполните логин и ФИО');
      return;
    }
    setDisabled(true);
    const password = generatePassword();
    console.log('Creating user', { username, fullname, password, roles });
    try {
      const newUser = await backend('/users', {
        method: 'POST',
        body: { username, fullname, password, roles },
      });
      setNewPassword(password);
      toast.success('Пользователь создан');
      setUsers([...users, newUser]);
    } catch (err) {
      toast.error(err.message || 'Не удалось создать пользователя');
    } finally {
      setDisabled(false);
    }
  }
  return (
    <div className="p-6">
      <Button className="mb-3" onClick={() => setOpen(true)}>Создать пользователя</Button>
      <h1 className="text-xl font-semibold tracking-tight">Админка</h1>
      <Table className="table-fixed w-full">
        <TableHeader className="text-[14px]">
          <TableRow>
            <TableHead >Логин</TableHead>
            <TableHead >ФИО</TableHead>
            <TableHead >Права доступа</TableHead>
            <TableHead >Создан</TableHead>
          </TableRow>
        </TableHeader>
  
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.username} onClick={() => setSelectedUser(user)}>
              <TableCell >{user.username}</TableCell>
              <TableCell >{user.fullname}</TableCell>
              <TableCell >{(user.roles ?? []).map(role => PERMISSIONS[role] || role).join(', ')}</TableCell>
              <TableCell >{new Date(user.createdAt).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent>
          <DialogHeader>
              <DialogTitle className="text-base items-center justify-center flex gap-2">
                <span>Детали пользователя {selectedUser?.fullname}</span>
              </DialogTitle>
          </DialogHeader>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground shrink-0">Создан:</span>{" "}
                <span className="font-medium"> {new Date(selectedUser?.createdAt).toLocaleString()} </span>
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground shrink-0">ФИО:</span>{" "}
                <Input defaultValue={selectedUser?.fullname} ref={fullnameRef} className="w-full" autoComplete="off" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground shrink-0">Логин:</span>
                <Input defaultValue={selectedUser?.username} ref={usernameRef} className="w-full" autoComplete="off" />
              </div>
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground shrink-0">Права доступа:</span>{" "}
                <Combobox multiple autoHighlight items={PERMISSIONS} defaultValue={selectedUser?.roles ?? []} onValueChange={setRoles}>
                  <ComboboxChips ref={anchor} className="w-full">
                    <ComboboxValue >
                      {(values) => (
                        <>
                          {values.map((value) => (
                            <ComboboxChip key={value}>{value}</ComboboxChip>
                          ))}
                          <ComboboxChipsInput/>
                        </>
                      )}
                    </ComboboxValue>
                  </ComboboxChips>
                  <ComboboxContent anchor={anchor}>
                    <ComboboxEmpty>No items found.</ComboboxEmpty>
                    <ComboboxList>
                      {(item) => (
                        <ComboboxItem key={item} value={item}>
                          {item}
                        </ComboboxItem>
                      )}
                    </ComboboxList>
                  </ComboboxContent>
                </Combobox>
              </div>
            </div>
            {newPassword && (
              <div className="rounded-lg bg-muted p-3 text-sm space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">Новый пароль:</span>
                  <code className="font-mono">{newPassword}</code>
                </div>
              </div>
            )}
            <DialogFooter className="sm:justify-between">
              <Button type="button" variant="destructive" disabled={disabled} onClick={handleDelete}>
                Удалить
              </Button>
              <div className="flex flex-col-reverse gap-2 sm:flex-row">
                <Button type="button" variant="outline" disabled={disabled} onClick={handleResetPassword}>
                  Сбросить пароль
                </Button>
                <Button type="button" variant="default" disabled={disabled} onClick={handleSave}>
                  Сохранить
                </Button>
              </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
              <DialogTitle className="text-base">
                <span>Создать пользователя</span>
              </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center gap-1">
                <span className="text-muted-foreground shrink-0">ФИО:</span>{" "}
                <Input defaultValue={selectedUser?.fullname} ref={fullnameRef} className="w-full" autoComplete="off" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground shrink-0">Логин:</span>
              <Input defaultValue={selectedUser?.username} ref={usernameRef} className="w-full" autoComplete="off" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-muted-foreground shrink-0">Права доступа:</span>{" "}
              <Combobox multiple autoHighlight items={PERMISSIONS} defaultValue={selectedUser?.roles ?? []} onValueChange={setRoles}>
                <ComboboxChips ref={anchor} className="w-full">
                  <ComboboxValue >
                    {(values) => (
                      <>
                        {values.map((value) => (
                          <ComboboxChip key={value}>{value}</ComboboxChip>
                        ))}
                        <ComboboxChipsInput/>
                      </>
                    )}
                  </ComboboxValue>
                </ComboboxChips>
                <ComboboxContent anchor={anchor}>
                  <ComboboxEmpty>No items found.</ComboboxEmpty>
                  <ComboboxList>
                    {(item) => (
                      <ComboboxItem key={item} value={item}>
                        {item}
                      </ComboboxItem>
                    )}
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
            </div>
          </div>
          {newPassword && (
            <div className="rounded-lg bg-muted p-3 text-sm space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Логин:</span>
                <code className="font-mono">{users[users.length - 1]?.username}</code>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">Пароль:</span>
                <code className="font-mono">{newPassword}</code>
              </div>
            </div>
          )}
          <DialogFooter className="sm:justify-between">
            <Button type="button" variant="default" disabled={disabled} onClick={handleCreateUser}>
              Создать
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function generatePassword() {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const bytes = new Uint32Array(12);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b % 10).join('');
  }
  let pwd = '';
  for (let i = 0; i < 12; i++) pwd += Math.floor(Math.random() * 10);
  return pwd;
}