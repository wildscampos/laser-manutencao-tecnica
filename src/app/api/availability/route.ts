import { NextRequest, NextResponse } from "next/server";
import { getFreeTimes } from "@/lib/appointments";

export async function GET(request: NextRequest) {
  const data = request.nextUrl.searchParams.get("data");

  if (!data || !/^\d{4}-\d{2}-\d{2}$/.test(data)) {
    return NextResponse.json({ error: "Data invalida." }, { status: 400 });
  }

  try {
    const horarios = await getFreeTimes(data);
    return NextResponse.json({ data, horarios });
  } catch (error) {
    console.error("availability_error", error);
    return NextResponse.json({ error: "Nao foi possivel consultar os horarios." }, { status: 500 });
  }
}
