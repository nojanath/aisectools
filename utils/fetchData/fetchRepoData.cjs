const fs = require('fs');
const path = require('path');

const reposFile = path.resolve(__dirname, '../../repos.txt');
const rawLines = fs.readFileSync(reposFile, 'utf8')
  .split('\n')
  .map(line => line.trim())
  .filter(line => line && !line.startsWith('#'));

// Parse each line into { platform, slug }.
// Bare "owner/repo" defaults to GitHub. "gitlab:owner/repo" or "gitlab:group/subgroup/repo" uses GitLab.
const entries = rawLines.map(line => {
  const colonIdx = line.indexOf(':');
  if (colonIdx > -1) {
    const prefix = line.slice(0, colonIdx).toLowerCase();
    const rest = line.slice(colonIdx + 1).trim();
    if (prefix === 'gitlab' || prefix === 'gl') return { platform: 'gitlab', slug: rest };
    if (prefix === 'github' || prefix === 'gh') return { platform: 'github', slug: rest };
  }
  return { platform: 'github', slug: line };
});

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITLAB_TOKEN = process.env.GITLAB_TOKEN; // optional — GitLab API allows unauthenticated read for public projects
const CONCURRENCY = 10;

if (!GITHUB_TOKEN && entries.some(e => e.platform === 'github')) {
  console.error("Error: GITHUB_TOKEN environment variable is not set.");
  process.exit(1);
}

const ghHeaders = {
  Authorization: `Bearer ${GITHUB_TOKEN}`,
  Accept: 'application/vnd.github+json',
};

const glHeaders = GITLAB_TOKEN ? { 'PRIVATE-TOKEN': GITLAB_TOKEN } : {};

async function jsonFetch(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) {
    throw new Error(`${url} responded ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function checkGithubRateLimit() {
  const data = await jsonFetch('https://api.github.com/rate_limit', ghHeaders);
  const remaining = data.resources.core.remaining;
  const resetTime = data.resources.core.reset;

  if (remaining < CONCURRENCY * 3) {
    const waitTime = resetTime * 1000 - Date.now() + 5000;
    console.log(`GitHub rate limit low (${remaining}). Waiting ${Math.round(waitTime / 1000)}s...`);
    await new Promise(resolve => setTimeout(resolve, waitTime));
    console.log('Resuming requests...');
  }
}

async function fetchGithubRepo(slug) {
  const [repoData, topicsData] = await Promise.all([
    jsonFetch(`https://api.github.com/repos/${slug}`, ghHeaders),
    jsonFetch(`https://api.github.com/repos/${slug}/topics`, ghHeaders),
  ]);

  const defaultBranch = repoData.default_branch;
  const branchData = await jsonFetch(
    `https://api.github.com/repos/${repoData.owner.login}/${repoData.name}/branches/${defaultBranch}`,
    ghHeaders
  );

  const fullRepoName = `${repoData.owner.login}/${repoData.name}`;

  return {
    name: fullRepoName,
    repo: repoData.html_url,
    stars: repoData.stargazers_count,
    last_commit: branchData.commit.commit.committer.date,
    language: repoData.language || "",
    description: repoData.description || "",
    tags: topicsData.names || [],
    platform: 'github',
    archived: repoData.archived === true,
  };
}

async function fetchGitlabRepo(slug) {
  // GitLab API uses URL-encoded path as project identifier.
  const encoded = encodeURIComponent(slug);
  const projectData = await jsonFetch(
    `https://gitlab.com/api/v4/projects/${encoded}`,
    glHeaders
  );

  const defaultBranch = projectData.default_branch;
  const branchPromise = defaultBranch
    ? jsonFetch(
        `https://gitlab.com/api/v4/projects/${projectData.id}/repository/branches/${encodeURIComponent(defaultBranch)}`,
        glHeaders
      ).catch(() => null)
    : Promise.resolve(null);
  const langsPromise = jsonFetch(
    `https://gitlab.com/api/v4/projects/${projectData.id}/languages`,
    glHeaders
  ).catch(() => ({}));

  const [branchData, langs] = await Promise.all([branchPromise, langsPromise]);

  const lastCommit = branchData?.commit?.committed_date || projectData.last_activity_at;
  const sortedLangs = Object.entries(langs).sort(([, a], [, b]) => b - a);
  const primaryLanguage = sortedLangs.length > 0 ? sortedLangs[0][0] : "";

  return {
    name: projectData.path_with_namespace,
    repo: projectData.web_url,
    stars: projectData.star_count || 0,
    last_commit: lastCommit,
    language: primaryLanguage,
    description: projectData.description || "",
    tags: projectData.topics || projectData.tag_list || [],
    platform: 'gitlab',
    archived: projectData.archived === true,
  };
}

async function fetchEntry(entry) {
  if (entry.platform === 'gitlab') return fetchGitlabRepo(entry.slug);
  return fetchGithubRepo(entry.slug);
}

async function fetchData() {
  const toolsData = [];
  let completed = 0;

  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    if (entries.slice(i, i + CONCURRENCY).some(e => e.platform === 'github') && GITHUB_TOKEN) {
      await checkGithubRateLimit();
    }

    const batch = entries.slice(i, i + CONCURRENCY);
    const results = await Promise.allSettled(
      batch.map(entry => fetchEntry(entry))
    );

    for (let j = 0; j < results.length; j++) {
      const result = results[j];
      if (result.status === 'fulfilled') {
        toolsData.push(result.value);
      } else {
        const entry = batch[j];
        const errorMsg = `[${new Date().toISOString()}] Error fetching ${entry.platform}:${entry.slug}: ${result.reason.message}\n`;
        fs.appendFileSync(path.resolve(__dirname, '../../errors.log'), errorMsg);
        console.error(errorMsg);
      }
    }

    completed += batch.length;
    console.log(`Progress: ${completed}/${entries.length}`);
  }

  // Sort alphabetically by name (case-insensitive) for deterministic output
  toolsData.sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

  const outputPath = path.resolve(__dirname, '../../src/data/tools.json');
  fs.writeFileSync(outputPath, JSON.stringify(toolsData, null, 2), 'utf8');
  console.log(`Done. ${toolsData.length} tools written to ${outputPath}`);
}

fetchData();
