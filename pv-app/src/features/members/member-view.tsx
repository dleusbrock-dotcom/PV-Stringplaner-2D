'use client'

import { useState, useTransition } from 'react'
import { Users, UserPlus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from '@/components/ui/toaster'
import { addProjectMember, removeProjectMember, updateMemberRole } from './member-actions'

const MEMBER_ROLES = [
  { value: 'manager', label: 'Bauleiter' },
  { value: 'planner', label: 'Planer' },
  { value: 'technician', label: 'Techniker' },
  { value: 'supervisor', label: 'Aufseher' },
]

interface Member {
  id: string
  role: string
  user: { id: string; name: string | null; email: string | null }
}

interface AvailableUser {
  id: string
  name: string | null
  email: string | null
}

interface MemberViewProps {
  projectId: string
  members: Member[]
  availableUsers: AvailableUser[]
  currentUserId: string
}

export function MemberView({ projectId, members, availableUsers, currentUserId }: MemberViewProps) {
  const [isPending, startTransition] = useTransition()
  const [showAdd, setShowAdd] = useState(false)
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedRole, setSelectedRole] = useState('technician')

  const memberUserIds = new Set(members.map((m) => m.user.id))
  const addableUsers = availableUsers.filter((u) => !memberUserIds.has(u.id))

  const handleAdd = () => {
    if (!selectedUser) return
    startTransition(async () => {
      try {
        await addProjectMember(projectId, selectedUser, selectedRole)
        setSelectedUser('')
        setShowAdd(false)
        toast({ title: 'Mitglied hinzugefügt', variant: 'success' })
      } catch (err) {
        toast({ title: String(err), variant: 'error' })
      }
    })
  }

  const handleRemove = (userId: string) => {
    startTransition(async () => {
      try {
        await removeProjectMember(projectId, userId)
        toast({ title: 'Mitglied entfernt', variant: 'success' })
      } catch (err) {
        toast({ title: String(err), variant: 'error' })
      }
    })
  }

  const handleRoleChange = (userId: string, role: string) => {
    startTransition(async () => {
      try {
        await updateMemberRole(projectId, userId, role)
        toast({ title: 'Rolle aktualisiert', variant: 'success' })
      } catch (err) {
        toast({ title: String(err), variant: 'error' })
      }
    })
  }

  return (
    <div className="p-4 max-w-xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1">
          <h1 className="font-bold text-[var(--ink)] text-lg">Projektmitglieder</h1>
          <p className="text-xs text-[var(--ink-soft)]">{members.length} Mitglieder</p>
        </div>
        {addableUsers.length > 0 && (
          <Button variant="primary" size="sm" onClick={() => setShowAdd(!showAdd)}>
            <UserPlus className="w-4 h-4" /> Hinzufügen
          </Button>
        )}
      </div>

      {showAdd && (
        <div className="bg-[var(--panel)] border border-[var(--accent)] rounded-[var(--radius)] p-4 mb-4 space-y-3">
          <h3 className="font-semibold text-sm text-[var(--ink)]">Mitglied hinzufügen</h3>
          <div>
            <label className="text-xs text-[var(--ink-soft)] mb-1 block">Nutzer</label>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-sm"
            >
              <option value="">Nutzer auswählen…</option>
              {addableUsers.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name ?? u.email}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-[var(--ink-soft)] mb-1 block">Rolle</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-[var(--line)] bg-[var(--bg)] text-[var(--ink)] text-sm"
            >
              {MEMBER_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="primary" size="sm" onClick={handleAdd} disabled={isPending || !selectedUser}>
              Hinzufügen
            </Button>
            <Button variant="secondary" size="sm" onClick={() => setShowAdd(false)}>Abbrechen</Button>
          </div>
        </div>
      )}

      {members.length === 0 ? (
        <div className="text-center py-16 text-[var(--ink-faint)]">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Noch keine Mitglieder</p>
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((member) => {
            const isCurrentUser = member.user.id === currentUserId
            return (
              <div
                key={member.id}
                className="bg-[var(--panel)] border border-[var(--line)] rounded-[var(--radius)] p-3 flex items-center gap-3"
              >
                <div className="w-9 h-9 rounded-full bg-[var(--accent)] flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {(member.user.name ?? member.user.email ?? '?')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm text-[var(--ink)] truncate">
                    {member.user.name ?? member.user.email}
                    {isCurrentUser && <span className="text-[10px] text-[var(--ink-faint)] ml-1">(Sie)</span>}
                  </div>
                  <div className="text-xs text-[var(--ink-faint)]">{member.user.email}</div>
                </div>
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.user.id, e.target.value)}
                  disabled={isPending}
                  className="px-2 py-1 rounded border border-[var(--line)] bg-[var(--bg)] text-xs text-[var(--ink)]"
                >
                  {MEMBER_ROLES.map((r) => (
                    <option key={r.value} value={r.value}>{r.label}</option>
                  ))}
                </select>
                {!isCurrentUser && (
                  <button
                    onClick={() => handleRemove(member.user.id)}
                    disabled={isPending}
                    className="p-1.5 rounded text-[var(--ink-faint)] hover:text-[var(--danger)] hover:bg-[var(--line)] transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
