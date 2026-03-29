export interface TenantTheme {
  primaryColor: string;
  primaryForeground: string;
  logoUrl?: string | undefined;
  appName: string;
}

export const defaultTheme: TenantTheme = {
  primaryColor: "#0f172a",
  primaryForeground: "#ffffff",
  appName: "Kern",
};
