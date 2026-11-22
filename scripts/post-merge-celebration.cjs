module.exports = async function postMergeCelebration({ github, context }) {
  const pr = context.payload.pull_request;
  if (!pr || !pr.merged) {
    console.log('Not a merged PR. Skipping celebration.');
    return;
  }

  const prNumber = pr.number;
  const prTitle = pr.title || '';
  const prBody = pr.body || '';
  let contributor = pr.user.login;

  // Check if submitted on behalf of someone via the issue form
  const submitterMatch = prBody.match(/Submitted by @([a-zA-Z0-9_-]+)/i);
  if (submitterMatch?.[1]) {
    contributor = submitterMatch[1];
  }

  // Detect which items were added in data/catalog.json
  const addedItems = [];
  try {
    const filesList = await github.rest.pulls.listFiles({
      owner: context.repo.owner,
      repo: context.repo.repo,
      pull_request_number: prNumber
    });

    const catalogFile = filesList.data.find(f => f.filename === 'data/catalog.json');
    if (catalogFile && catalogFile.patch) {
      const idMatches = [...catalogFile.patch.matchAll(/\+\s*"id":\s*"([^"]+)"/g)];
      const titleMatches = [...catalogFile.patch.matchAll(/\+\s*"title":\s*"([^"]+)"/g)];
      for (let i = 0; i < idMatches.length; i++) {
        addedItems.push({
          id: idMatches[i][1],
          title: titleMatches[i] ? titleMatches[i][1] : idMatches[i][1]
        });
      }
    }
  } catch (err) {
    console.warn('Could not inspect PR file list:', err.message);
  }

  // Fallback: search title or body
  if (addedItems.length === 0) {
    const titleMatch = prTitle.match(/add (?:submission from #\d+|([A-Za-z0-9_-]+))/i);
    if (titleMatch?.[1]) {
      addedItems.push({ id: titleMatch[1], title: titleMatch[1] });
    }
  }

  const serverTitle = addedItems.length > 0 ? addedItems[0].title : 'your Model Context Protocol server';
  const serverId = addedItems.length > 0 ? addedItems[0].id : 'mcp-server';
  const slug = serverId.replace(/[^a-zA-Z0-9_-]/g, '-').toLowerCase();

  const serverPageUrl = `https://mcp.ritualdev.in/servers/${slug}.html`;
  const tweetText = encodeURIComponent(
    `Excited to share that ${serverTitle} is now officially verified on @RitualDev's MCPShelf — the open Model Context Protocol registry with 1-click install for Cursor & Claude Desktop! ⚡\n\n${serverPageUrl}`
  );
  const tweetUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;

  const commentBody = [
    `# 🚀 Congratulations @${contributor}! Your MCP Server is officially LIVE! 🎉`,
    '',
    `Your submission of **${serverTitle}** has passed all schema audits, capability introspection, and security checks, and is now merged into \`main\`!`,
    '',
    '### 🌐 Permanent Live Listing & Deep Links',
    'Your server has a dedicated, high-ranking SEO landing page with verified trust score, context token footprint, and 1-click install deep links for Cursor, Claude Desktop, Windsurf, Cline, and Zed:',
    `👉 **[View ${serverTitle} on MCPShelf](${serverPageUrl})**`,
    '',
    '---',
    '',
    '### 🏷️ Embed Verification Badges in your GitHub README',
    'Showcase official verification and your live trust score directly on your repository:',
    '',
    '```markdown',
    `[![Verified on MCPShelf](https://mcp.ritualdev.in/api/v1/badges/verified/${slug}.svg)](${serverPageUrl})`,
    '```',
    '',
    '```markdown',
    `[![Trust Score](https://mcp.ritualdev.in/api/v1/badges/trust/${slug}.svg)](${serverPageUrl})`,
    '```',
    '',
    '---',
    '',
    '### 📢 Share with the Community',
    `Help other developers discover your tools: **[Share on Twitter / X](${tweetUrl})**`,
    '',
    '### ⚡ Boost Developer Installs',
    'Want to feature your server on the homepage banner, top of search, and weekly AI newsletter?',
    'Check out our self-serve developer boost tiers at [mcp.ritualdev.in/boost.html](https://mcp.ritualdev.in/boost.html).',
    '',
    'Thank you for contributing to the open AI agent ecosystem! 🤖✨'
  ].join('\n');

  await github.rest.issues.createComment({
    owner: context.repo.owner,
    repo: context.repo.repo,
    issue_number: prNumber,
    body: commentBody
  });
};
