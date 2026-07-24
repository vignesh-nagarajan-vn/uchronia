import { World } from '@uchronia/core'
import { Hono } from 'hono'
import type { ServerDeps } from '../deps.js'
import { renderMarkdown, renderStaticHtml } from '../exporters.js'
import { ApiError } from '../http-error.js'
import { assembleBranchView } from '../views.js'

export function branchRoutes(deps: ServerDeps): Hono {
  const app = new Hono()
  const { repo } = deps

  const worldFor = (branchId: string): World => {
    const timelineId = repo.branchTimelineId(branchId)
    if (!timelineId) throw new ApiError(404, 'not-found', 'branch not found')
    const aggregate = repo.loadAggregate(timelineId)
    if (!aggregate) throw new ApiError(404, 'not-found', 'timeline not found')
    return World.fromAggregate(aggregate)
  }

  app.get('/branches/:id/view', (c) => {
    const branchId = c.req.param('id')
    return c.json(assembleBranchView(worldFor(branchId), branchId))
  })

  app.get('/branches/:id/export.md', (c) => {
    const branchId = c.req.param('id')
    const markdown = renderMarkdown(worldFor(branchId), branchId)
    c.header('Content-Type', 'text/markdown; charset=utf-8')
    c.header('Content-Disposition', `attachment; filename="uchronia-${branchId}.md"`)
    return c.body(markdown)
  })

  app.get('/branches/:id/export.html', (c) => {
    const branchId = c.req.param('id')
    const html = renderStaticHtml(worldFor(branchId), branchId)
    c.header('Content-Disposition', `inline; filename="uchronia-${branchId}.html"`)
    return c.html(html)
  })

  // Burn one branch. Roots are the timeline (delete that instead); branches
  // with children would leave dangling shared history, so they refuse.
  app.delete('/branches/:id', (c) => {
    const branchId = c.req.param('id')
    const world = worldFor(branchId)
    const branch = world.getBranch(branchId)
    if (branch.parentBranchId === null) {
      throw new ApiError(
        409,
        'root-branch',
        'the root line is the timeline; delete the timeline instead',
      )
    }
    const children = repo.childBranchIds(branchId)
    if (children.length > 0) {
      throw new ApiError(
        409,
        'has-children',
        `${children.length} branch(es) fork from this line; burn them first`,
      )
    }
    repo.deleteBranchCascade(branchId)
    return c.body(null, 204)
  })

  return app
}
