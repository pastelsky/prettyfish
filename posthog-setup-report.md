<wizard-report>
# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into PrettyFish, a Mermaid diagram editor. PostHog was initialized in `src/main.tsx` using environment variables, with autocapture enabled by default. Eleven custom events were instrumented across five files, covering the full diagram lifecycle (create, delete, duplicate), export behavior broken down by format, template selection, share link usage, project file management, workspace reset, theme changes, and page creation.

| Event | Description | File |
|-------|-------------|------|
| `diagram_created` | User adds a new diagram to the canvas | `src/App.tsx` |
| `diagram_deleted` | User deletes a diagram from the canvas | `src/App.tsx` |
| `diagram_duplicated` | User duplicates an existing diagram | `src/App.tsx` |
| `share_link_copied` | User copies a shareable diagram link | `src/components/Header.tsx` |
| `project_saved` | User saves their project to a file | `src/components/Header.tsx` |
| `project_loaded` | User loads a project from a file | `src/components/Header.tsx` |
| `workspace_reset` | User confirms resetting the workspace | `src/components/Header.tsx` |
| `theme_changed` | User changes the mermaid diagram theme | `src/components/Header.tsx` |
| `page_added` | User adds a new page | `src/components/Header.tsx` |
| `diagram_exported` | User exports a diagram (SVG/PNG/MMD) with `format` and optional `scale` properties | `src/components/ExportPopover.tsx` |
| `template_selected` | User selects a diagram template, with `template_id` and `template_name` properties | `src/components/TemplateGallery.tsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- **Dashboard — Analytics basics**: https://us.posthog.com/project/369846/dashboard/1432399
- **Diagram Lifecycle: Created, Deleted & Duplicated**: https://us.posthog.com/project/369846/insights/0HaN3Z94
- **Diagram Export Format Breakdown**: https://us.posthog.com/project/369846/insights/TY5ov1OB
- **Create to Export Funnel**: https://us.posthog.com/project/369846/insights/8OtSCo4w
- **Most Popular Diagram Templates**: https://us.posthog.com/project/369846/insights/jEJtKkxV
- **Sharing & Project File Activity**: https://us.posthog.com/project/369846/insights/EKjSB4yf

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.

</wizard-report>
