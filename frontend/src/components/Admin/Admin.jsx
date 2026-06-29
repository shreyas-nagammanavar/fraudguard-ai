import React, { useEffect, useState } from 'react';
import { TrashIcon, PencilSquareIcon, UsersIcon } from '@heroicons/react/24/outline';
import API from '../../utils/api';
import toast from 'react-hot-toast';
import { EmptyState, PageHeader } from '../UI';

export default function Admin() {
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);

  const fetchUsers = async () => {
    setLoading(true);
    try { const { data } = await API.get('/admin/users'); setUsers(data.users); }
    catch { toast.error('Failed to load users'); }
    finally { setLoading(false); }
  };
  useEffect(() => { fetchUsers(); }, []);

  const handleUpdate = async (id) => {
    try {
      await API.patch(`/admin/users/${id}`, editing);
      toast.success('User updated');
      setEditing(null);
      fetchUsers();
    } catch { toast.error('Update failed'); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this user?')) return;
    try { await API.delete(`/admin/users/${id}`); toast.success('Deleted'); fetchUsers(); }
    catch { toast.error('Delete failed'); }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
      <PageHeader title="User Management" subtitle="Manage analyst accounts and permissions" />

      <div className="glass-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-500 uppercase border-b border-white/5 bg-dark-800/50">
                {['#','Username','Email','Role','Status','Last Login','Actions'].map(h => (
                  <th key={h} className="py-3 px-4 text-left">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? [...Array(3)].map((_, i) => (
                <tr key={i} className="border-b border-white/5">
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="py-3 px-4"><div className="h-4 skeleton rounded w-24" /></td>
                  ))}
                </tr>
              )) : users.length === 0 ? (
                <tr><td colSpan="7" className="py-0">
                  <EmptyState icon={UsersIcon} title="No users found" />
                </td></tr>
              ) : users.map(u => (
                <tr key={u.id} className="table-row">
                  <td className="py-3 px-4 text-slate-500 text-xs">{u.id}</td>
                  <td className="py-3 px-4 font-medium text-white">{u.username}</td>
                  <td className="py-3 px-4 text-slate-400">{u.email}</td>
                  <td className="py-3 px-4">
                    {editing?.id === u.id ? (
                      <select value={editing.role}
                        onChange={e => setEditing(s => ({ ...s, role: e.target.value }))}
                        className="bg-dark-700 border border-white/10 rounded-lg px-2 py-1 text-xs text-white">
                        <option value="analyst">analyst</option>
                        <option value="admin">admin</option>
                      </select>
                    ) : (
                      <span className={`badge ${u.role === 'admin' ? 'bg-brand-500/20 text-brand-400 border-brand-500/30' : 'bg-slate-500/20 text-slate-400 border-slate-500/30'}`}>
                        {u.role}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4">
                    {editing?.id === u.id ? (
                      <input type="checkbox" checked={editing.is_active}
                        onChange={e => setEditing(s => ({ ...s, is_active: e.target.checked }))}
                        className="accent-brand-500" />
                    ) : (
                      <span className={`badge ${u.is_active ? 'badge-safe' : 'badge-fraud'}`}>
                        {u.is_active ? 'Active' : 'Disabled'}
                      </span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-xs">
                    {u.last_login ? new Date(u.last_login).toLocaleString() : 'Never'}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      {editing?.id === u.id ? (
                        <>
                          <button onClick={() => handleUpdate(u.id)}
                            className="px-2 py-1 bg-brand-600/80 rounded-lg text-xs text-white hover:bg-brand-500">
                            Save
                          </button>
                          <button onClick={() => setEditing(null)}
                            className="px-2 py-1 bg-dark-600 rounded-lg text-xs text-slate-400 hover:text-white">
                            Cancel
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => setEditing({ id: u.id, role: u.role, is_active: u.is_active })}
                            className="p-1.5 rounded-lg hover:bg-brand-500/20 text-slate-500 hover:text-brand-400 transition-colors">
                            <PencilSquareIcon className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(u.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-colors">
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
