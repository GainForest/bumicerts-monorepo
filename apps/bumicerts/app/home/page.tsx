import { redirect } from "next/navigation";
import { links } from "@/lib/links";

export default function HomePage() {
  redirect(links.explore);
}
