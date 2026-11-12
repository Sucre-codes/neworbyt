import "dotenv/config";
import app from "./app";
import { connectDb } from "./config/db";

const port = process.env.PORT || 4000;

async function main() {
  await connectDb();
  app.listen(port, () => console.log(`Orbyt API on http://localhost:${port}`));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});