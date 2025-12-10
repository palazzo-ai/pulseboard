# Pulseboard

A visual roadmap and opportunity timeline for Palazzo product development.

## Features

- **Timeline View** — Visual grid of opportunities by area and month
- **Milestones** — Track delivery commitments with progress indicators
- **Status Tracking** — Not Started, In Progress, Done, Blocked statuses
- **At Risk Flags** — Highlight opportunities that need attention
- **Drag & Drop** — Easily move opportunities and milestones
- **Filtering** — Filter by initiative, area, milestone, or status
- **Data Export/Import** — Save and restore your timeline data
- **Local Storage** — Auto-saves to browser (will be replaced by Supabase)

## Tech Stack

- React 18
- Vite
- Tailwind CSS
- Local Storage (Supabase planned)

## Development

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This project is configured for Vercel deployment:

1. Push to GitHub
2. Connect repo to Vercel
3. Deploy automatically

## Environment Variables

For Claude chat integration (optional):
```
VITE_ANTHROPIC_API_KEY=your_api_key_here
```

For Supabase (planned):
```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

## Roadmap

- [ ] Supabase database integration
- [ ] User authentication
- [ ] Linear sync (Claude-mediated)
- [ ] List/table view
- [ ] Impact/effort prioritization grid

## License

Private - Palazzo AI
