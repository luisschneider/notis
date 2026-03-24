import { redirect } from "next/navigation";

export default async function DashboardPage(): Promise<React.JSX.Element> {
  redirect("/dashboard/settings");
}
