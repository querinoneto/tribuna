import { NextResponse, type NextRequest } from "next/server";
import { confirmSubscription } from "@/lib/newsletter/service";

/** Link do e-mail de confirmação da assinatura. */
export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token") ?? "";
  const result = await confirmSubscription(token);
  return NextResponse.redirect(new URL(`/assinatura?situacao=${result}`, request.url), 303);
}
