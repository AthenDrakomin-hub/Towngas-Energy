"use client";

import { useState, useEffect } from "react";
import { Card } from "@/components/ui/display/Card";
import { Button } from "@/components/ui/form/Button";
import { Input } from "@/components/ui/form/Input";

interface User {
  id: number;
  username: string;
  nickname: string;
  role: string;
  status: string;
  createdAt: string;
  lastLoginAt?: string;
  balance?: number;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");

  const fetchUsers = async (kw = "") => {
    setLoading(true);
    const res = await fetch(`/api/admin/users?keyword=${kw}`);
    const json = await res.json();
    if (json.ok) {
      setUsers(json.data.list || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const toggleStatus = async (user: User) => {
    const newStatus = user.status === "active" ? "banned" : "active";
    await fetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, status: newStatus }),
    });
    fetchUsers(keyword);
  };

  if (loading) {
    return <div className="p-6 text-gray-500">加载中...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-800">用户管理</h1>
        <div className="flex gap-2">
          <Input
            placeholder="搜索用户名..."
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <Button size="sm" variant="secondary" onClick={() => fetchUsers(keyword)}>
            搜索
          </Button>
        </div>
      </div>

      <Card title={`共 ${users.length} 个用户`} status="live">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="py-2">ID</th>
                <th className="py-2">用户名</th>
                <th className="py-2">角色</th>
                <th className="py-2">余额</th>
                <th className="py-2">状态</th>
                <th className="py-2">注册时间</th>
                <th className="py-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-gray-100">
                  <td className="py-2">{u.id}</td>
                  <td className="py-2 font-medium text-gray-800">{u.username}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      u.role === "super" ? "bg-red-100 text-red-700" :
                      u.role === "admin" ? "bg-blue-100 text-blue-700" :
                      u.role === "user" ? "bg-gray-100 text-gray-600" :
                      "bg-gray-100 text-gray-500"
                    }`}>
                      {u.role}
                    </span>
                  </td>
                  <td className="py-2">¥{u.balance || 0}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-0.5 text-xs ${
                      u.status === "active" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                    }`}>
                      {u.status === "active" ? "正常" : "已禁用"}
                    </span>
                  </td>
                  <td className="py-2 text-xs text-gray-500">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-2">
                    <button
                      onClick={() => toggleStatus(u)}
                      className={`rounded px-2 py-1 text-xs ${
                        u.status === "active" ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-green-50 text-green-600 hover:bg-green-100"
                      }`}
                    >
                      {u.status === "active" ? "禁用" : "启用"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {users.length === 0 && (
            <p className="py-8 text-center text-gray-400">暂无用户</p>
          )}
        </div>
      </Card>
    </div>
  );
}
