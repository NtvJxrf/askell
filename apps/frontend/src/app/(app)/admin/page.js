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
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible"
import { ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"

const PAGE_SIZE = 10;

export default function AdminPage() {
  const [users, setUsers] = useState([]);
  const [page, setPage] = useState(1);
  useEffect(() => {
    const fetchUsers = async () => {
      const res = await backend('/users');
      setUsers(res);
    };
    fetchUsers();
  }, []);
  const [systemInfo, setSystemInfo] = useState(null);
  const [systemInfoLoading, setSystemInfoLoading] = useState(true);
  const fetchSystemInfo = async () => {
    setSystemInfoLoading(true);
    try {
      const res = await backend('/system/info');
      setSystemInfo(res);
    } catch (err) {
      toast.error(err.message || 'Не удалось получить статус сервисов');
    } finally {
      setSystemInfoLoading(false);
    }
  };
  useEffect(() => {
    fetchSystemInfo();
  }, []);
  const totalPages = Math.max(1, Math.ceil(users.length / PAGE_SIZE));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);
  const paginatedUsers = users.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const [ selectedUser, setSelectedUser] = useState(null);
  const anchor = useComboboxAnchor()
  const usernameRef = useRef(null);
  const fullnameRef = useRef(null);
  const [disabled, setDisabled] = useState(false);
  const [newPassword, setNewPassword] = useState(null);
  const [roles, setRoles] = useState([]);
  const [open, setOpen] = useState(false);
  const messageRef = useRef(null);
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
      <div className="flex gap-3">
        <div className="flex-1">
          <Table className="table-fixed w-full flex-1">
            <TableHeader className="text-[14px]">
              <TableRow>
                <TableHead >Логин</TableHead>
                <TableHead >ФИО</TableHead>
                <TableHead >Права доступа</TableHead>
                <TableHead >Создан</TableHead>
              </TableRow>
            </TableHeader>
      
            <TableBody>
              {paginatedUsers.map((user) => (
                <TableRow key={user.username} onClick={() => setSelectedUser(user)}>
                  <TableCell >{user.username}</TableCell>
                  <TableCell >{user.fullname}</TableCell>
                  <TableCell >
                    <span className={"block truncate"} title={(user.roles ?? []).map(role => PERMISSIONS[role] || role).join(', ')}>
                      {(user.roles ?? []).map(role => PERMISSIONS[role] || role).join(', ')}
                    </span>
                  </TableCell>
                  <TableCell >{new Date(user.createdAt).toLocaleString()}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between mt-3">
            <span className="text-sm text-muted-foreground">
              Страница {page} из {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="size-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
        <div className="flex-1 flex flex-col gap-2">
          <div className="flex gap-2 justify-center items-center">
              <Button onClick={async () => {
                const message = messageRef.current?.value;
                if (message) {
                  await backend("/globalToast", { 
                    method: "POST",
                    body: { message } 
                  });
                }else{
                  toast.error("Введите сообщение");
                }
              }}>Сообщение всем</Button>
              <Textarea ref={messageRef} className="min-w-0" placeholder="Введите сообщение для всех пользователей..." />
          </div>
          <Button className="self-start" onClick={async () => {
            await backend("/reloadApp", { 
              method: "POST",
              body: {}
            });
          }}>Обновить страницу у всех</Button>
        </div>
      </div>
      <div className="mt-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold tracking-tight">Статус сервисов Moleculer</h2>
          <Button variant="outline" size="icon" onClick={fetchSystemInfo} disabled={systemInfoLoading}>
            <RefreshCw className={systemInfoLoading ? "size-4 animate-spin" : "size-4"} />
          </Button>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card>
            <CardHeader>
              <CardTitle>Узлы</CardTitle>
              <CardDescription>
                {systemInfo ? `${systemInfo.nodes.length} узлов, ${systemInfo.nodes.filter(n => n.available).length} онлайн` : 'Загрузка...'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(systemInfo?.nodes ?? []).map((node) => (
                <div key={node.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{node.id}{node.local && <span className="text-muted-foreground font-normal"> (текущий)</span>}</div>
                    <div className="text-muted-foreground text-xs truncate">{node.hostname ?? '—'} · {node.ipList?.[0] ?? '—'} · {node.client?.type} {node.client?.version}</div>
                  </div>
                  <Badge variant={node.available ? 'default' : 'destructive'}>{node.available ? 'online' : 'offline'}</Badge>
                </div>
              ))}
              {systemInfo && systemInfo.nodes.length === 0 && (
                <div className="text-sm text-muted-foreground">Нет подключённых узлов</div>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Сервисы и действия</CardTitle>
              <CardDescription>
                {systemInfo ? `${systemInfo.services.length} сервисов` : 'Загрузка...'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5 max-h-[420px] overflow-y-auto">
              {(systemInfo?.services ?? []).map((svc) => (
                <Collapsible key={svc.name}>
                  <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg border px-3 py-2 text-sm hover:bg-muted/50">
                    <span className="font-medium">{svc.name}{svc.version != null && <span className="text-muted-foreground"> v{svc.version}</span>}</span>
                    <span className="text-muted-foreground text-xs">{svc.actions.length} actions · {svc.nodes.length} узл.</span>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="px-3 py-2 space-y-1 border-x border-b rounded-b-lg -mt-px">
                    {svc.actions.length === 0 && (
                      <div className="text-xs text-muted-foreground">Нет публичных действий</div>
                    )}
                    {svc.actions.map((action) => (
                      <div key={action.name} className="flex items-center gap-2 text-xs">
                        <code className="font-mono text-muted-foreground">{action.rest ?? action.name}</code>
                        {action.auth === false && <Badge variant="outline">public</Badge>}
                      </div>
                    ))}
                  </CollapsibleContent>
                </Collapsible>
              ))}
              {systemInfo && systemInfo.services.length === 0 && (
                <div className="text-sm text-muted-foreground">Нет зарегистрированных сервисов</div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
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