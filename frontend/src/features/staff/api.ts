import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, apiList } from "@/lib/api/client";
import { useAuthStore, type MyShop } from "@/lib/auth/store";

export type StaffMember = {
  id: string;
  user_id: string;
  user_phone: string;
  user_name: string;
  shop_id: string;
  role_id: string;
  role_name: string;
  status: "invited" | "active" | "suspended" | "removed";
  display_name: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
};

export type AssignableStaff = {
  id: string;
  display_name: string;
  role_name: string;
};

export type Role = {
  id: string;
  name: string;
  is_system: boolean;
  permissions: string[];
};

export type InviteItem = {
  id: string;
  shop_id: string;
  phone: string;
  role_id: string;
  role_name: string;
  invited_by_name: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

export type MyInvite = {
  id: string;
  shop_id: string;
  shop_name: string;
  role_id: string;
  role_name: string;
  inviter_name: string;
  expires_at: string;
  created_at: string;
};

export function useStaffList() {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: ["staff", shopId],
    queryFn: async () => {
      const res = await apiList<StaffMember>("/staff/");
      return res.items;
    },
    enabled: Boolean(shopId),
  });
}

export function useAssignableStaff() {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: ["staff", "assignable", shopId],
    queryFn: () => api<AssignableStaff[]>("/staff/assignable/"),
    enabled: Boolean(shopId),
  });
}

export function useStaffMember(memberId: string | null) {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: ["staff-member", shopId, memberId],
    queryFn: () => api<StaffMember>(`/staff/${memberId}/`),
    enabled: Boolean(shopId && memberId),
  });
}

export function useRolesList() {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: ["roles", shopId],
    queryFn: async () => {
      const res = await apiList<Role>("/roles/");
      return res.items;
    },
    enabled: Boolean(shopId),
  });
}

export function useInvitesList() {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: ["invites", shopId],
    queryFn: async () => {
      const res = await apiList<InviteItem>("/invites/");
      return res.items;
    },
    enabled: Boolean(shopId),
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  const shopId = useAuthStore((s) => s.shopId);
  return useMutation({
    mutationFn: (body: { phone: string; role_id: string }) =>
      api<InviteItem>("/invites/", { method: "POST", body }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites", shopId] });
    },
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();
  const shopId = useAuthStore((s) => s.shopId);
  return useMutation({
    mutationFn: (id: string) => api(`/invites/${id}/`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["invites", shopId] });
    },
  });
}

export function useChangeRole() {
  const queryClient = useQueryClient();
  const shopId = useAuthStore((s) => s.shopId);
  return useMutation({
    mutationFn: ({ memberId, roleId }: { memberId: string; roleId: string }) =>
      api<StaffMember>(`/staff/${memberId}/role/`, { method: "POST", body: { role_id: roleId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", shopId] });
      queryClient.invalidateQueries({ queryKey: ["staff-member"] });
    },
  });
}

export function useSetMemberStatus() {
  const queryClient = useQueryClient();
  const shopId = useAuthStore((s) => s.shopId);
  return useMutation({
    mutationFn: ({ memberId, action }: { memberId: string; action: "suspend" | "reactivate" | "remove" }) =>
      api(`/staff/${memberId}/${action}/`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff", shopId] });
      queryClient.invalidateQueries({ queryKey: ["staff-member"] });
    },
  });
}

export function useMyInvites() {
  return useQuery({
    queryKey: ["my-invites"],
    queryFn: () => api<MyInvite[]>("/me/invites/", { shop: false }),
  });
}

export function useAcceptInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api<MyShop[]>(`/me/invites/${id}/accept/`, { method: "POST", shop: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-invites"] });
    },
  });
}

export function useDeclineInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api(`/me/invites/${id}/decline/`, { method: "POST", shop: false }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-invites"] });
    },
  });
}

export type ShopJoinCode = {
  join_code: string;
  expires_at: string | null;
  enabled: boolean;
  is_expired: boolean;
};

export type ConfigureJoinCodePayload = {
  duration?: "24h" | "2d" | "5d" | "7d" | "never" | "custom";
  custom_days?: number;
  regenerate?: boolean;
  enabled?: boolean;
};

export type JoinRequestItem = {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string | null;
  user_phone: string | null;
  display_name: string;
  status: string;
  created_at: string;
};

export type JoinShopResponse = {
  shop_id: string;
  shop_name: string;
  membership_id: string;
  status: string;
};

export function useShopJoinCode() {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: ["shop-join-code", shopId],
    queryFn: () => api<ShopJoinCode>("/shops/current/join-code/"),
    enabled: Boolean(shopId),
  });
}

export function useConfigureJoinCode() {
  const queryClient = useQueryClient();
  const shopId = useAuthStore((s) => s.shopId);
  return useMutation({
    mutationFn: (payload: ConfigureJoinCodePayload) =>
      api<ShopJoinCode>("/shops/current/join-code/", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["shop-join-code", shopId], data);
    },
  });
}

export function useJoinShopWithCode() {
  return useMutation({
    mutationFn: (code: string) =>
      api<JoinShopResponse>("/shops/join/", {
        method: "POST",
        body: JSON.stringify({ code }),
        shop: false,
      }),
  });
}

export function usePendingJoinRequests() {
  const shopId = useAuthStore((s) => s.shopId);
  return useQuery({
    queryKey: ["staff-requests", shopId],
    queryFn: () => api<JoinRequestItem[]>("/staff/requests/"),
    enabled: Boolean(shopId),
  });
}

export function useApproveJoinRequest() {
  const queryClient = useQueryClient();
  const shopId = useAuthStore((s) => s.shopId);
  return useMutation({
    mutationFn: ({ requestId, roleId }: { requestId: string; roleId: string }) =>
      api<JoinRequestItem>(`/staff/requests/${requestId}/approve/`, {
        method: "POST",
        body: JSON.stringify({ role_id: roleId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-requests", shopId] });
      queryClient.invalidateQueries({ queryKey: ["staff", shopId] });
    },
  });
}

export function useRejectJoinRequest() {
  const queryClient = useQueryClient();
  const shopId = useAuthStore((s) => s.shopId);
  return useMutation({
    mutationFn: (requestId: string) =>
      api(`/staff/requests/${requestId}/reject/`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["staff-requests", shopId] });
    },
  });
}
