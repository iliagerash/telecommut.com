import { authClient } from "@/auth/client";

export default function AdminLogoutButton() {
  async function handleLogout() {
    try {
      await authClient.signOut();
    } finally {
      window.location.href = "/";
    }
  }

  return (
    <button type="button" className="text-blue-700 underline" onClick={handleLogout}>
      Logout
    </button>
  );
}
