'use client'
import { backend } from "@/lib/backend";
import { useState, useEffect } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
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
  const [ selectedUser, setSelectedUser] = useState(null);
  return (
    <div className="p-8">
      <h1 className="text-xl font-semibold tracking-tight">Админка</h1>
      <Table className="table-fixed w-full">
        <TableHeader className="text-[14px]">
          <TableRow>
            <TableHead >Логин</TableHead>
            <TableHead >Роли</TableHead>
            <TableHead >Создан</TableHead>
          </TableRow>
        </TableHeader>
  
        <TableBody>
          {users.map((user) => (
            <TableRow key={user.username} onClick={() => setSelectedUser(user)}>
              <TableCell >{user.username}</TableCell>
              <TableCell >{user.roles.join(', ')}</TableCell>
              <TableCell >{new Date(user.createdAt).toLocaleString()}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={selectedUser} onOpenChange={() => setSelectedUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
              <DialogTitle className="text-base mb-5 items-center justify-center flex gap-2">
                <span>Детали пользователя {selectedUser?.fullname}</span>
                
              </DialogTitle>
          </DialogHeader>
            <div className="space-y-1">
              <div>
                <span className="text-muted-foreground">Создан:</span>{" "}
                <span className="font-medium"> {new Date(selectedUser?.createdAt).toLocaleString()} </span>
              </div>
              <div>
                <span className="text-muted-foreground">ФИО:</span>{" "}
                <span className="font-medium"> {selectedUser?.fullname} </span>
              </div>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}