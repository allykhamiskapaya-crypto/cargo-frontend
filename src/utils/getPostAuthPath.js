function getPostAuthPath(user) {
  const role = String(user?.role || "").replace(/^ROLE_/, "");
  const isMobile = typeof window !== "undefined"
    && window.matchMedia("(max-width: 767px)").matches;

  return role === "CUSTOMER" && isMobile ? "/booking" : "/dashboard";
}

export default getPostAuthPath;
