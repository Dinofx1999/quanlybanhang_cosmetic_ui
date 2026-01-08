// src/services/branchContext.ts
export const BRANCH_KEY = "activeBranchId"; // "all" | "<id>"

export function getActiveBranchId(user: any): string {
  const role = String(user?.role || "").toUpperCase();
  const userBranch = user?.branchId ? String(user.branchId) : "";

  if (role === "STAFF") return userBranch; // khóa

  // ADMIN/MANAGER
  const saved = localStorage.getItem(BRANCH_KEY);
  return saved && saved.length ? saved : "all";
}

export function setActiveBranchId(id: string) {
  localStorage.setItem(BRANCH_KEY, id);
}
