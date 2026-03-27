import { useState, useEffect, useCallback } from 'react'
import { listUsers, createUser, updateUser, deleteUser, updatePassword, logout } from './api'

const EMPTY_FORM = { username: '', password: '', first_name: '', last_name: '', tower_name: '', tower_number: '', block: '', flat_number: '' }

function Avatar({ user }) {
  const initials = [user.first_name, user.last_name].filter(Boolean).map(s => s[0].toUpperCase()).join('') || user.username[0].toUpperCase()
  return (
    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-semibold text-sm shrink-0">
      {initials}
    </div>
  )
}

function Field({ label, value, onChange, type = 'text', required, autoComplete, placeholder }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <input
        type={type}
        required={required}
        autoComplete={autoComplete}
        placeholder={placeholder}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
      />
    </div>
  )
}

function TopBar({ title, subtitle, onLogout, children }) {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
      <div>
        <h1 className="text-lg font-bold text-gray-900">{title}</h1>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        {children}
        {onLogout && (
          <button onClick={onLogout} className="text-sm text-gray-400 hover:text-gray-600">Logout</button>
        )}
      </div>
    </div>
  )
}

export default function AdminScreen({ token, onLogout }) {
  const [view, setView]       = useState('users') // 'users' | 'form'
  const [users, setUsers]     = useState([])
  const [editing, setEditing] = useState(null)
  const [form, setForm]       = useState(EMPTY_FORM)
  const [search, setSearch]   = useState('')
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')
  const [busy, setBusy]       = useState(false)

  const set = (key) => (val) => setForm(f => ({ ...f, [key]: val }))

  const handleLogout = async () => {
    await logout(token).catch(() => {})
    onLogout()
  }

  const fetchUsers = useCallback(async () => {
    try { setUsers(await listUsers(token)) } catch (err) { setError(err.message) }
  }, [token])

  useEffect(() => { if (view === 'users' || view === 'form') fetchUsers() }, [view, fetchUsers])

  const openNew = () => {
    setEditing(null); setForm(EMPTY_FORM); setError(''); setSuccess(''); setView('form')
  }

  const openEdit = (u) => {
    setEditing(u); setForm({ ...u, password: '' }); setError(''); setSuccess(''); setView('form')
  }

  const handleSubmit = async (e) => {
    e.preventDefault(); setBusy(true); setError('')
    try {
      if (editing) {
        await updateUser(token, editing.username, {
          first_name: form.first_name, last_name: form.last_name,
          tower_name: form.tower_name, tower_number: form.tower_number,
          block: form.block, flat_number: form.flat_number,
        })
        if (form.password) await updatePassword(token, editing.username, form.password)
        setSuccess('User updated.')
      } else {
        await createUser(token, form)
        setSuccess(`User "${form.username}" created.`)
        setForm(EMPTY_FORM)
      }
      fetchUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleDelete = async (username) => {
    if (!confirm(`Delete user "${username}"?`)) return
    setBusy(true)
    try {
      await deleteUser(token, username)
    fetchUsers()
    if (editing?.username === username) setView('users')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase()
    if (!q) return true
    return [u.username, u.first_name, u.last_name, u.tower_name, u.block,
      String(u.tower_number ?? ''), String(u.flat_number ?? '')]
      .some(v => v?.toLowerCase().includes(q))
  })

  // ── Users list ─────────────────────────────────────────────────────────────
  if (view === 'users') return (
    <div className="min-h-screen bg-gray-50">
      <TopBar title="Users" subtitle={`${filteredUsers.length} of ${users.length}`} onLogout={handleLogout}>
        <button onClick={openNew}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          + Add User
        </button>
      </TopBar>

      <div className="px-6 pt-4">
        <input
          type="search"
          placeholder="Search by name, username, tower, block, flat…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
        />
      </div>

      {error && <p className="text-red-500 text-xs text-center mt-4">{error}</p>}

      <div className="p-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredUsers.length === 0 ? (
          <div className="col-span-full text-center py-16 text-gray-400 text-sm">
            {search ? 'No users match your search.' : 'No users yet. Click "+ Add User" to get started.'}
          </div>
        ) : filteredUsers.map(u => (
          <div key={u.username}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 flex items-start gap-3 hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => openEdit(u)}>
            <Avatar user={u} />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-gray-800 truncate">
                {[u.first_name, u.last_name].filter(Boolean).join(' ') || u.username}
              </p>
              <p className="text-xs text-gray-400 truncate">@{u.username}</p>
              {(u.tower_name || u.tower_number || u.block || u.flat_number) && (
                <p className="text-xs text-gray-500 mt-1">
                  {[u.tower_name, u.tower_number && `Tower ${u.tower_number}`, u.block && `Block ${u.block}`, u.flat_number && `Flat ${u.flat_number}`].filter(Boolean).join(' · ')}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )

  // ── Form view ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <button onClick={() => { setView('users'); setError(''); setSuccess('') }}
          className="text-gray-400 hover:text-gray-600 text-sm">← Back</button>
        <h1 className="text-lg font-bold text-gray-900 flex-1">{editing ? 'Edit User' : 'New User'}</h1>
        {editing && (
          <button onClick={() => handleDelete(editing.username)} disabled={busy}
            className="text-sm text-red-500 hover:text-red-700 disabled:opacity-50">Delete</button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="max-w-lg mx-auto p-6 space-y-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Account</p>
          <Field label="Username" value={form.username} onChange={set('username')}
            required autoComplete="off" placeholder="e.g. jsmith" />
          {editing && <p className="text-xs text-gray-400 -mt-2">Leave password blank to keep unchanged.</p>}
          <Field label={editing ? 'New Password' : 'Password'} value={form.password}
            onChange={set('password')} type="password" required={!editing}
            autoComplete="new-password" placeholder="••••••••" />
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Personal Details</p>
          <div className="grid grid-cols-2 gap-4">
            <Field label="First Name" value={form.first_name} onChange={set('first_name')} placeholder="John" required />
            <Field label="Last Name"  value={form.last_name}  onChange={set('last_name')}  placeholder="Smith" required />
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Location</p>
          <Field label="Tower Name" value={form.tower_name} onChange={set('tower_name')} placeholder="Sunrise" />
          <div className="grid grid-cols-3 gap-4">
            <Field label="Tower No." value={form.tower_number} onChange={set('tower_number')} type="number" placeholder="1" required />
            <Field label="Block"     value={form.block}        onChange={set('block')}        placeholder="A" required />
            <Field label="Flat No."  value={form.flat_number}  onChange={set('flat_number')}  type="number" placeholder="101" required />
          </div>
        </div>

        {error   && <p className="text-red-500 text-xs">{error}</p>}
        {success && <p className="text-green-600 text-xs">{success}</p>}

        <button type="submit" disabled={busy}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-3 rounded-2xl text-sm transition-colors">
          {busy ? 'Saving…' : editing ? 'Save Changes' : 'Create User'}
        </button>
      </form>
    </div>
  )
}
