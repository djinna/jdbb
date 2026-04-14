import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("deploy", {
    description: "Commit and push changes to deploy to djinna.com via GitHub Pages",
    handler: async (args, ctx) => {
      const message = args?.trim() || "Update site";

      ctx.ui.notify("Deploying to djinna.com...", "info");

      // Stage all changes
      const add = await pi.exec("git", ["add", "-A"], { cwd: ctx.cwd });
      if (add.code !== 0) {
        ctx.ui.notify(`git add failed: ${add.stderr}`, "error");
        return;
      }

      // Check if there's anything to commit
      const status = await pi.exec("git", ["status", "--porcelain"], { cwd: ctx.cwd });
      if (status.stdout.trim() === "") {
        ctx.ui.notify("Nothing to deploy — no changes since last commit.", "warning");
        return;
      }

      // Commit
      const commit = await pi.exec("git", ["commit", "-m", message], { cwd: ctx.cwd });
      if (commit.code !== 0) {
        ctx.ui.notify(`git commit failed: ${commit.stderr}`, "error");
        return;
      }

      // Push
      const push = await pi.exec("git", ["push"], { cwd: ctx.cwd });
      if (push.code !== 0) {
        ctx.ui.notify(`git push failed: ${push.stderr}`, "error");
        return;
      }

      ctx.ui.notify(`✅ Deployed to djinna.com — "${message}"`, "success");
    },
  });

  // Also register as a tool the LLM can call
  const { Type } = require("@sinclair/typebox");

  pi.registerTool({
    name: "deploy_site",
    label: "Deploy Site",
    description: "Commit and push all changes to deploy djinna.com via GitHub Pages",
    promptSnippet: "Deploy the site to djinna.com (git add, commit, push)",
    parameters: Type.Object({
      message: Type.Optional(Type.String({ description: "Commit message (default: 'Update site')" })),
    }),
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const message = params.message?.trim() || "Update site";

      const add = await pi.exec("git", ["add", "-A"], { cwd: ctx.cwd });
      if (add.code !== 0) {
        throw new Error(`git add failed: ${add.stderr}`);
      }

      const status = await pi.exec("git", ["status", "--porcelain"], { cwd: ctx.cwd });
      if (status.stdout.trim() === "") {
        return {
          content: [{ type: "text", text: "Nothing to deploy — no changes since last commit." }],
          details: { deployed: false },
        };
      }

      const commit = await pi.exec("git", ["commit", "-m", message], { cwd: ctx.cwd });
      if (commit.code !== 0) {
        throw new Error(`git commit failed: ${commit.stderr}`);
      }

      const push = await pi.exec("git", ["push"], { cwd: ctx.cwd });
      if (push.code !== 0) {
        throw new Error(`git push failed: ${push.stderr}`);
      }

      return {
        content: [{ type: "text", text: `✅ Deployed to djinna.com with message: "${message}"` }],
        details: { deployed: true, message },
      };
    },
  });
}
