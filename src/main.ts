import * as core from '@actions/core'
import * as github from '@actions/github'
import * as fs from 'fs'
import * as path from 'path'

interface Repository {
  name: string
  description: string | null
  html_url: string
  created_at: string
}

function mapToRepository(repo: Record<string, unknown>): Repository {
  return {
    name: String(repo.name),
    description: repo.description as string | null,
    html_url: String(repo.html_url),
    created_at: String(repo.created_at || '')
  }
}

export async function run(): Promise<void> {
  try {
    const token = core.getInput('token', { required: true })
    const owner = core.getInput('owner', { required: true })
    const readmePath = core.getInput('readme-path') || 'README.md'
    const marker = core.getInput('marker') || '<!--PROJECTS-->'
    const excludeInput = core.getInput('exclude') || ''
    const excludeList = excludeInput
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
    const commit = core.getInput('commit') === 'true'
    const commitMessage =
      core.getInput('commit-message') || 'docs: update projects list'

    const octokit = github.getOctokit(token)

    // Determine if owner is an organization or user
    let isOrg = false
    try {
      await octokit.rest.orgs.get({ org: owner })
      isOrg = true
    } catch {
      // Not an organization, assume it's a user
      isOrg = false
    }

    core.info(
      `Fetching repositories for ${isOrg ? 'organization' : 'user'}: ${owner}`
    )

    // Fetch all repositories for the owner
    const repos: Repository[] = []
    let page = 1
    const perPage = 100

    while (true) {
      const response = isOrg
        ? await octokit.rest.repos.listForOrg({
            org: owner,
            per_page: perPage,
            page,
            sort: 'created',
            direction: 'asc'
          })
        : await octokit.rest.repos.listForUser({
            username: owner,
            per_page: perPage,
            page,
            sort: 'created',
            direction: 'asc'
          })

      if (response.data.length === 0) {
        break
      }

      repos.push(...response.data.map(mapToRepository))
      page++

      if (response.data.length < perPage) {
        break
      }
    }

    // Filter out excluded repositories and sort by creation time (already sorted from API)
    const filteredRepos = repos
      .filter((repo) => !excludeList.includes(repo.name))
      .sort(
        (a, b) =>
          new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
      )

    core.info(`Found ${filteredRepos.length} repositories`)

    // Generate projects list in markdown format
    const projectsMarkdown = filteredRepos
      .map((repo) => {
        const description = repo.description ? ` - ${repo.description}` : ''
        return `- [${repo.name}](${repo.html_url})${description}`
      })
      .join('\n')

    // Read README file
    const workspacePath = process.env.GITHUB_WORKSPACE || '.'
    const fullReadmePath = path.join(workspacePath, readmePath)

    if (!fs.existsSync(fullReadmePath)) {
      core.setFailed(`README file not found: ${fullReadmePath}`)
      return
    }

    let readmeContent = fs.readFileSync(fullReadmePath, 'utf-8')

    // Check if marker exists
    if (!readmeContent.includes(marker)) {
      core.setFailed(
        `Marker "${marker}" not found in ${readmePath}. Please add the marker to your README.`
      )
      return
    }

    // Replace marker with projects list
    // Keep content before and after marker, replace content between markers
    const markerRegex = new RegExp(
      `${escapeRegExp(marker)}[\\s\\S]*?${escapeRegExp(marker)}`,
      'g'
    )

    if (markerRegex.test(readmeContent)) {
      // Marker found in pairs, replace content between them
      readmeContent = readmeContent.replace(
        markerRegex,
        `${marker}\n${projectsMarkdown}\n${marker}`
      )
    } else {
      // Single marker, replace everything after it
      const markerIndex = readmeContent.indexOf(marker)
      const beforeMarker = readmeContent.substring(
        0,
        markerIndex + marker.length
      )
      readmeContent = `${beforeMarker}\n${projectsMarkdown}`
    }

    // Write updated README
    fs.writeFileSync(fullReadmePath, readmeContent)

    core.info(
      `Successfully updated ${readmePath} with ${filteredRepos.length} projects`
    )

    // Commit and push if enabled
    if (commit) {
      core.info('Committing changes...')

      const githubActor = process.env.GITHUB_ACTOR
      const githubRepo = process.env.GITHUB_REPOSITORY
      const githubSha = process.env.GITHUB_SHA

      if (!githubActor || !githubRepo || !githubSha) {
        core.warning('Missing environment variables for commit, skipping...')
      } else {
        const [repoOwner, repoName] = githubRepo.split('/')

        // Create commit with retry logic
        let committed = false
        let retries = 3

        while (!committed && retries > 0) {
          try {
            // Get the file SHA for update
            let fileSha = ''
            try {
              const fileResponse = await octokit.rest.repos.getContent({
                owner: repoOwner,
                repo: repoName,
                path: readmePath
              })
              if (
                !Array.isArray(fileResponse.data) &&
                fileResponse.data.type === 'file'
              ) {
                fileSha = fileResponse.data.sha
              }
            } catch {
              // File might be new, continue without SHA
            }

            // Create commit
            const commitResponse =
              await octokit.rest.repos.createOrUpdateFileContents({
                owner: repoOwner,
                repo: repoName,
                path: readmePath,
                message: commitMessage,
                content: Buffer.from(readmeContent).toString('base64'),
                sha: fileSha || undefined
              })

            core.info(`Committed as: ${commitResponse.data.commit.sha}`)
            committed = true
          } catch (error) {
            retries--
            if (retries > 0) {
              core.warning(
                `Commit failed, retrying... (${retries} retries left)`
              )
              await new Promise((resolve) => setTimeout(resolve, 1000))
            } else {
              throw error
            }
          }
        }
      }
    }

    // Set output
    core.setOutput('projects-count', filteredRepos.length.toString())
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    }
  }
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

run()
