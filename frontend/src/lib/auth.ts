export const getAuthHeaders = (): HeadersInit => {
  if (typeof window === "undefined") {
    throw new Error("localStorage is not available");
  }

  const credentialsStr = localStorage.getItem("credentials");
  if (!credentialsStr) {
    throw new Error("Credentials not found in localStorage");
  }

  const { username, password } = JSON.parse(credentialsStr);
  if (!username || !password) {
    throw new Error("Username or password not found in localStorage credentials");
  }

  const encoded = btoa(`${username}:${password}`);
  return {
    Authorization: `Basic ${encoded}`,
    "Content-Type": "application/json",
  };
};
