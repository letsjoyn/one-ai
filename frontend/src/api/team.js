import { api } from "./client";

export async function fetchTeam() {
    const response = await api.get("/api/team");
    return response.data;
}

export async function inviteMember(email, role) {
    const response = await api.post("/api/team/invitations", { email, role });
    return response.data.invitation;
}

export async function revokeInvitation(invitationId) {
    await api.delete(`/api/team/invitations/${invitationId}`);
}

export async function updateMemberRole(userId, role) {
    const response = await api.patch(`/api/team/members/${userId}`, { role });
    return response.data.member;
}

export async function removeMember(userId) {
    await api.delete(`/api/team/members/${userId}`);
}

export async function acceptInvitation(token, password) {
    const response = await api.post(
        "/api/team/accept-invite",
        { token, password },
        { skipAuthRedirect: true }
    );
    return response.data;
}
