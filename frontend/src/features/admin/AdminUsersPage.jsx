import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiRequest } from "../../shared/api/client";
import { Alert } from "../../shared/ui/Alert";
import { ConfirmModal } from "../../shared/ui/ConfirmModal";
import { Loading } from "../../shared/ui/Loading";
import { useAuth } from "../auth/AuthProvider";


const PAGE_SIZE = 50;
const displayNamePattern = /^[A-Za-z0-9 _-]{3,24}$/;


export function AdminUsersPage() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [editingUser, setEditingUser] = useState(null);
  const [displayName, setDisplayName] = useState("");
  const [suspendingUser, setSuspendingUser] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState("");
  const [reactivatingUser, setReactivatingUser] = useState(null);
  const [message, setMessage] = useState(null);

  const users = useQuery({
    queryKey: ["admin", "users", search, page],
    queryFn: ({ signal }) => apiRequest(`/admin/users?search=${encodeURIComponent(search)}&limit=${PAGE_SIZE}&offset=${page * PAGE_SIZE}`, { token, signal }),
  });

  const invalidateUsers = () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] });

  const updateUser = useMutation({
    mutationFn: () => apiRequest(`/admin/users/${editingUser.id}`, { method: "PATCH", token, body: { display_name: displayName.trim() } }),
    onSuccess: () => {
      setMessage({ tone: "success", text: "Display name updated." });
      setEditingUser(null);
      invalidateUsers();
    },
    onError: (error) => setMessage({ tone: "error", text: error.message }),
  });

  const suspendUser = useMutation({
    mutationFn: () => apiRequest(`/admin/users/${suspendingUser.id}/suspend`, { method: "POST", token, body: { reason: suspensionReason.trim() } }),
    onSuccess: () => {
      setMessage({ tone: "success", text: "User suspended from rated play." });
      setSuspendingUser(null);
      setSuspensionReason("");
      invalidateUsers();
    },
    onError: (error) => setMessage({ tone: "error", text: error.message }),
  });

  const reactivateUser = useMutation({
    mutationFn: () => apiRequest(`/admin/users/${reactivatingUser.id}/reactivate`, { method: "POST", token }),
    onSuccess: () => {
      setMessage({ tone: "success", text: "User reactivated." });
      setReactivatingUser(null);
      invalidateUsers();
    },
    onError: (error) => setMessage({ tone: "error", text: error.message }),
  });

  function openEdit(user) {
    setEditingUser(user);
    setDisplayName(user.display_name);
  }

  const displayNameError = displayName && !displayNamePattern.test(displayName.trim())
    ? "Use 3-24 letters, numbers, spaces, underscores, or hyphens."
    : null;

  return (
    <main className="page py-8">
      <p className="eyebrow">Admin</p>
      <h1 className="mt-1 text-3xl font-black">User management</h1>
      <p className="mt-2 text-slate-600">Search users, edit display names, and manage rated-play suspensions.</p>

      {message ? <div className="mt-5"><Alert tone={message.tone}>{message.text}</Alert></div> : null}

      <form
        className="card mt-6 flex flex-col gap-3 p-4 sm:flex-row"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(0);
          setSearch(searchInput.trim());
        }}
      >
        <input className="input" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Search display name or user ID" />
        <button className="btn btn-primary sm:w-32" type="submit">Search</button>
      </form>

      <section className="mt-6">
        {users.isLoading ? <Loading label="Loading users" /> : null}
        {users.isError ? <Alert tone="error">{users.error.message}</Alert> : null}
        {users.data ? (
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="p-4">User</th>
                    <th className="p-4">Rating</th>
                    <th className="p-4">Rank</th>
                    <th className="p-4">Games</th>
                    <th className="p-4">Wins</th>
                    <th className="p-4">Losses</th>
                    <th className="p-4">Peak</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.data.map((user) => (
                    <tr key={user.id} className="border-t border-slate-100 align-top">
                      <td className="p-4">
                        <div className="font-bold">{user.display_name}</div>
                        <div className="mt-1 font-mono text-xs text-slate-500">{user.id}</div>
                      </td>
                      <td className="p-4 font-black text-brand">{user.rating}</td>
                      <td className="p-4">#{user.rating_rank}</td>
                      <td className="p-4">{user.rated_games}</td>
                      <td className="p-4">{user.rated_wins}</td>
                      <td className="p-4">{user.rated_losses}</td>
                      <td className="p-4">{user.peak_rating}</td>
                      <td className="p-4">
                        {user.suspended_at ? (
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">Suspended</span>
                        ) : (
                          <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">Active</span>
                        )}
                        {user.suspension_reason ? <div className="mt-2 max-w-xs text-xs text-slate-500">{user.suspension_reason}</div> : null}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-2">
                          <button className="btn btn-secondary py-2 text-xs" type="button" onClick={() => openEdit(user)}>Edit</button>
                          {user.suspended_at ? (
                            <button className="btn btn-secondary py-2 text-xs" type="button" onClick={() => setReactivatingUser(user)}>Reactivate</button>
                          ) : (
                            <button className="btn btn-danger py-2 text-xs" type="button" onClick={() => setSuspendingUser(user)}>Suspend</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!users.data.length ? <div className="p-6 text-center text-slate-500">No users found.</div> : null}
          </div>
        ) : null}
      </section>

      <div className="mt-5 flex justify-end gap-2">
        <button type="button" className="btn btn-secondary" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Previous</button>
        <button type="button" className="btn btn-secondary" disabled={!users.data || users.data.length < PAGE_SIZE} onClick={() => setPage((current) => current + 1)}>Next</button>
      </div>

      {editingUser ? (
        <ConfirmModal
          title="Edit display name"
          confirmLabel="Save"
          onConfirm={() => updateUser.mutate()}
          onCancel={() => setEditingUser(null)}
          busy={updateUser.isPending}
          confirmDisabled={Boolean(displayNameError) || !displayName.trim() || displayName.trim() === editingUser.display_name}
        >
          <label className="block text-sm font-bold text-ink">
            Display name
            <input className="input mt-1" value={displayName} onChange={(event) => setDisplayName(event.target.value)} />
          </label>
          {displayNameError ? <div className="mt-3"><Alert tone="error">{displayNameError}</Alert></div> : null}
        </ConfirmModal>
      ) : null}

      {suspendingUser ? (
        <ConfirmModal
          title={`Suspend ${suspendingUser.display_name}?`}
          confirmLabel="Suspend"
          danger
          onConfirm={() => suspendUser.mutate()}
          onCancel={() => setSuspendingUser(null)}
          busy={suspendUser.isPending}
          confirmDisabled={suspensionReason.trim().length < 3}
        >
          <p>This blocks the user from starting new rated games. Existing history is preserved.</p>
          <label className="mt-4 block text-sm font-bold text-ink">
            Reason
            <textarea className="input mt-1 min-h-24" value={suspensionReason} onChange={(event) => setSuspensionReason(event.target.value)} />
          </label>
        </ConfirmModal>
      ) : null}

      {reactivatingUser ? (
        <ConfirmModal
          title={`Reactivate ${reactivatingUser.display_name}?`}
          confirmLabel="Reactivate"
          onConfirm={() => reactivateUser.mutate()}
          onCancel={() => setReactivatingUser(null)}
          busy={reactivateUser.isPending}
        >
          This allows the user to start rated games again.
        </ConfirmModal>
      ) : null}
    </main>
  );
}
