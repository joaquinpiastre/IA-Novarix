export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { iniciarCronSeguimientos } = await import("./jobs/seguimientos");
    iniciarCronSeguimientos();
  }
}
