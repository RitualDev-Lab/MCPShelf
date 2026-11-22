module.exports = async function postSubmissionComment({ github, context, prUrl, prNumber, serverSlug, serverTitle }) {
  const username = context.payload.issue.user.login;
  const slug = serverSlug || 'mcp-server';
  const title = serverTitle || 'MCP Server';

  const commentBody = [
    `🎉 **Thank you @${username} for submitting ${title} to MCPShelf!**`,
    '',
    prUrl
      ? `We have automatically introspected your server manifest and opened a Pull Request:\n👉 **[Pull Request #${prNumber}](${prUrl})**`
      : 'Your submission has been verified and processed.',
    '',
    '### 🛡️ Automated Verification & Introspection Pipeline',
    '- **Security & Sandbox Scan**: Privileges, shell execution, and network access scanned.',
    '- **Trust Score Rubric**: Objective scoring applied across code provenance, package integrity, and schema compliance.',
    '- **Client Configs**: 1-Click install configs generated for Cursor, Claude Desktop, Windsurf, Cline, and Zed.',
    '- **Co-Author Attribution**: You are credited as Co-Author on the submission commit.',
    '',
    '---',
    '',
    '### 🏷️ Display the "Verified on MCPShelf" Badge in your README',
    'Once merged, your server will be live at `https://mcp.ritualdev.in/servers/' + slug + '.html`.',
    'You can showcase official verification directly in your repository README:',
    '',
    '```markdown',
    `[![Verified on MCPShelf](https://mcp.ritualdev.in/api/v1/badges/verified/${slug}.svg)](https://mcp.ritualdev.in/servers/${slug}.html)`,
    '```',
    '',
    'Or with your live Trust Score:',
    '```markdown',
    `[![Trust Score](https://mcp.ritualdev.in/api/v1/badges/trust/${slug}.svg)](https://mcp.ritualdev.in/servers/${slug}.html)`,
    '```',
    '',
    'Thank you for powering the open-source Model Context Protocol ecosystem! 🚀'
  ].join('\n');

  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: context.issue.number,
    body: commentBody
  });
};
