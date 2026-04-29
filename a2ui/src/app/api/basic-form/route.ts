type BasicFormRequest = {
  value?: string;
};

export async function POST(request: Request) {
  const body = (await request.json()) as BasicFormRequest;
  const value = typeof body.value === "string" ? body.value : "";

  if (!value.trim()) {
    return Response.json({ error: "Please enter a value." }, { status: 400 });
  }

  return Response.json({ received: value });
}
