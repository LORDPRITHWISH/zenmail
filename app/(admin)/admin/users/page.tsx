'use client';

import { useEffect, useMemo, useState, useTransition } from 'react';
import { adminGetUsers, adminSetUserRole } from '@/app/actions/admin-actions';
import { ShieldCheck, User, MagnifyingGlass } from '@phosphor-icons/react';

interface UserItem {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  createdAt: string;
  _count: { emails: number };
  isSuperAdmin?: boolean;
  role: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        !q || u.name?.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
      const matchesRole = !roleFilter || u.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [users, search, roleFilter]);

  useEffect(() => {
    adminGetUsers().then((data) => {
      setUsers(data as UserItem[]);
      setIsLoading(false);
    });
  }, []);

  const handleRoleChange = (userId: string, newRole: 'user' | 'admin') => {
    startTransition(async () => {
      await adminSetUserRole(userId, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold text-foreground">Users</h1>

      <div className="mb-4 flex items-center gap-3">
        <div className="relative max-w-md flex-1">
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50"
          />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="h-9 w-full rounded-lg border border-border bg-muted/50 pl-9 pr-4 text-sm focus:border-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-9 rounded-lg border border-border bg-muted/50 px-3 text-sm focus:outline-none"
        >
          <option value="">All Roles</option>
          <option value="user">User</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                User
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Email
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Role
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Emails
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Joined
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No users match your search
                </td>
              </tr>
            )}
            {filteredUsers.map((user) => (
              <tr
                key={user.id}
                className="border-b border-border/50 transition-colors hover:bg-muted/30"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-3">
                    {user.image ? (
                      <img
                        src={user.image}
                        alt=""
                        className="h-8 w-8 rounded-full"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {user.name?.[0]?.toUpperCase() || '?'}
                      </div>
                    )}
                    <span className="text-sm font-medium text-foreground">
                      {user.name || 'Unknown'}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {user.email}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium ${
                      user.role === 'admin'
                        ? 'bg-amber-500/10 text-amber-600'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {user.role === 'admin' ? (
                      <ShieldCheck size={12} weight="fill" />
                    ) : (
                      <User size={12} />
                    )}
                    {user.role}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {user._count.emails}
                </td>
                <td className="px-4 py-3 text-sm text-muted-foreground">
                  {new Date(user.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <select
                    value={user.role}
                    onChange={(e) =>
                      handleRoleChange(
                        user.id,
                        e.target.value as 'user' | 'admin'
                      )
                    }
                    disabled={isPending || user.isSuperAdmin}
                    className="h-8 rounded-md border border-border bg-background px-2 text-xs focus:outline-none disabled:opacity-50"
                    title={user.isSuperAdmin ? "Superadmin cannot be demoted" : "Change role"}
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
