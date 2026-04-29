# AI Security Tools

A directory of open-source AI security tools at [aisectools.dev](https://aisectools.dev).

Search, filter, and sort tools across guardrails, scanners, red-team frameworks, and agentic-AI security. Data is pulled fresh from GitHub and GitLab daily.

## Contributing

1. Fork the repo
2. Add the tool to `repos.txt` (one repo per line). Keep it alphabetized.
   - GitHub: `owner/repo` (e.g. `protectai/llm-guard`)
   - GitLab: `gitlab:owner/repo` or `gitlab:group/subgroup/repo`
3. Submit a pull request

## Local development

```sh
npm install
npm run dev
```

## Refreshing tool data

The site reads from `src/data/tools.json`. To regenerate:

```sh
export GITHUB_TOKEN=ghp_xxx        # required for GitHub entries
export GITLAB_TOKEN=glpat_xxx      # optional — only needed for private GitLab projects
node utils/fetchData/fetchRepoData.cjs
```

## License

MIT

## Contact

[LinkedIn](https://linkedin.com/in/thompsoninfosec) | [GitHub Issues](https://github.com/nojanath/aisectools/issues)
