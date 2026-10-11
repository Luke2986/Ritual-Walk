try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the real environment.
}

// Imported after loading .env because db.ts reads DATABASE_URL at import time.
import("./app").then(({ createApp }) => {
  const port = parseInt(process.env.PORT || "5000", 10);
  createApp().listen(port, "0.0.0.0", () => {
    console.log(`Step Ritual API listening on port ${port}`);
  });
});
