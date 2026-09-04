export async function sendOpinionAccessMail(input: {
  email: string;
  opinionId: string;
  rawToken: string;
}): Promise<void> {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Mock mail sender is disabled in production");
  }

  const baseUrl = process.env.APP_BASE_URL ?? "http://localhost:3000";
  console.info(
    `[mock-mail] confirmation URL for opinion ${input.opinionId}: ${baseUrl}/access/${input.rawToken}`,
  );
}
