import { Hono } from "hono";
import { layout, homeContent } from "./utils";

const app = new Hono();

// Render a basic homepage placeholder to make sure the app is up
app.get("/", async (c) => {
  const content = await homeContent(c.req.raw);
  return c.html(layout(content, "MCP Remote Auth Demo - Home"));
});

export default app;
