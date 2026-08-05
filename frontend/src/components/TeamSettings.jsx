import { Mail, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { useEffect, useState } from "react";

import {
    fetchTeam,
    inviteMember,
    removeMember,
    revokeInvitation,
    updateMemberRole
} from "../api/team";
import { useAuth } from "../context/AuthContext";

function TeamSettings() {
    const { user } = useAuth();
    const [members, setMembers] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("member");
    const [loading, setLoading] = useState(true);
    const [busyId, setBusyId] = useState("");
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    async function loadTeam() {
        try {
            const result = await fetchTeam();
            setMembers(result.members || []);
            setInvitations(result.invitations || []);
            setError("");
        } catch (requestError) {
            setError(requestError?.response?.data?.error || "Could not load workspace members.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadTeam();
    }, []);

    async function handleInvite(event) {
        event.preventDefault();
        setBusyId("invite");
        setError("");
        setMessage("");
        try {
            const invitation = await inviteMember(email, role);
            setInvitations((current) => [invitation, ...current]);
            setEmail("");
            setRole("member");
            setMessage("Invitation sent.");
        } catch (requestError) {
            setError(requestError?.response?.data?.error || "Could not send the invitation.");
        } finally {
            setBusyId("");
        }
    }

    async function handleRoleChange(member, nextRole) {
        setBusyId(member.userId);
        setError("");
        try {
            const updated = await updateMemberRole(member.userId, nextRole);
            setMembers((current) => current.map((item) => (
                item.userId === updated.userId ? updated : item
            )));
        } catch (requestError) {
            setError(requestError?.response?.data?.error || "Could not change the member role.");
        } finally {
            setBusyId("");
        }
    }

    async function handleRemove(member) {
        if (!window.confirm(`Remove ${member.email} from this workspace?`)) {
            return;
        }
        setBusyId(member.userId);
        setError("");
        try {
            await removeMember(member.userId);
            setMembers((current) => current.filter((item) => item.userId !== member.userId));
        } catch (requestError) {
            setError(requestError?.response?.data?.error || "Could not remove the member.");
        } finally {
            setBusyId("");
        }
    }

    async function handleRevoke(invitation) {
        setBusyId(invitation.id);
        setError("");
        try {
            await revokeInvitation(invitation.id);
            setInvitations((current) => current.filter((item) => item.id !== invitation.id));
        } catch (requestError) {
            setError(requestError?.response?.data?.error || "Could not revoke the invitation.");
        } finally {
            setBusyId("");
        }
    }

    return (
        <section className="border border-line bg-surface">
            <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
                <div>
                    <h2 className="text-sm font-semibold">Team access</h2>
                    <p className="mt-1 text-xs text-secondary">Members share documents, while conversations remain private.</p>
                </div>
                <span className="inline-flex h-7 items-center gap-2 border border-line bg-subtle px-2 text-xs font-medium">
                    <Users size={14} />
                    {members.length}
                </span>
            </div>

            {(error || message) && (
                <div
                    className={`mx-5 mt-5 border px-3 py-2 text-xs ${
                        error
                            ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
                            : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300"
                    }`}
                >
                    {error || message}
                </div>
            )}

            {user?.role === "admin" && (
                <form
                    className="grid gap-3 border-b border-line p-5 sm:grid-cols-[minmax(0,1fr)_130px_auto]"
                    onSubmit={handleInvite}
                >
                    <input
                        className="field h-10"
                        type="email"
                        required
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        placeholder="teammate@company.com"
                        aria-label="Invitee email"
                    />
                    <select
                        className="field h-10"
                        value={role}
                        onChange={(event) => setRole(event.target.value)}
                        aria-label="Invitation role"
                    >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                    </select>
                    <button className="button-primary" type="submit" disabled={busyId === "invite"}>
                        <UserPlus size={16} />
                        {busyId === "invite" ? "Sending..." : "Invite"}
                    </button>
                </form>
            )}

            <div className="divide-y divide-line">
                {loading && <p className="px-5 py-8 text-center text-sm text-secondary">Loading team...</p>}
                {!loading && members.map((member) => {
                    const isCurrentUser = member.userId === user?.userId;
                    return (
                        <div
                            key={member.userId}
                            className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_130px_40px] sm:items-center"
                        >
                            <div className="flex min-w-0 items-center gap-3">
                                <span className="grid h-9 w-9 shrink-0 place-items-center border border-line bg-subtle text-secondary">
                                    <Shield size={16} />
                                </span>
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-medium">
                                        {member.email}
                                        {isCurrentUser && <span className="ml-2 text-xs text-secondary">(you)</span>}
                                    </p>
                                    <p className="mt-1 text-[11px] text-secondary">
                                        {member.emailVerified ? "Email verified" : "Verification pending"}
                                    </p>
                                </div>
                            </div>

                            {user?.role === "admin" && !isCurrentUser ? (
                                <select
                                    className="field h-9"
                                    value={member.role}
                                    onChange={(event) => handleRoleChange(member, event.target.value)}
                                    disabled={busyId === member.userId}
                                    aria-label={`Role for ${member.email}`}
                                >
                                    <option value="member">Member</option>
                                    <option value="admin">Admin</option>
                                </select>
                            ) : (
                                <span className="text-xs capitalize text-secondary sm:text-right">{member.role}</span>
                            )}

                            {user?.role === "admin" && !isCurrentUser ? (
                                <button
                                    type="button"
                                    className="icon-button h-9 w-9 border-0 hover:text-red-600"
                                    onClick={() => handleRemove(member)}
                                    disabled={busyId === member.userId}
                                    aria-label={`Remove ${member.email}`}
                                    title="Remove member"
                                >
                                    <Trash2 size={15} />
                                </button>
                            ) : (
                                <span />
                            )}
                        </div>
                    );
                })}
            </div>

            {invitations.length > 0 && (
                <div className="border-t border-line">
                    <div className="bg-subtle px-5 py-3 text-xs font-semibold text-secondary">Pending invitations</div>
                    <div className="divide-y divide-line">
                        {invitations.map((invitation) => (
                            <div
                                key={invitation.id}
                                className="grid gap-3 px-5 py-4 sm:grid-cols-[minmax(0,1fr)_130px_40px] sm:items-center"
                            >
                                <div className="flex min-w-0 items-center gap-3">
                                    <Mail size={16} className="shrink-0 text-secondary" />
                                    <p className="truncate text-sm">{invitation.email}</p>
                                </div>
                                <span className="text-xs capitalize text-secondary sm:text-right">{invitation.role}</span>
                                {user?.role === "admin" ? (
                                    <button
                                        type="button"
                                        className="icon-button h-9 w-9 border-0 hover:text-red-600"
                                        onClick={() => handleRevoke(invitation)}
                                        disabled={busyId === invitation.id}
                                        aria-label={`Revoke invitation for ${invitation.email}`}
                                        title="Revoke invitation"
                                    >
                                        <Trash2 size={15} />
                                    </button>
                                ) : (
                                    <span />
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </section>
    );
}

export default TeamSettings;
