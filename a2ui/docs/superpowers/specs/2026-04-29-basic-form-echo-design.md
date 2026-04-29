# Basic form echo design

## Problem

The current demos focus on AGUI and CopilotKit flows, which is heavier than needed for a minimal client-to-server example. We need a separate entry that shows the smallest useful interaction: one input, one button, and a server response rendered back on the page.

## Goal

Add a new standalone demo page that lets the user type a value, submit it to the server, and see the server echo the same value back in the UI.

## Scope

### In scope

- A new page route for the demo
- One text input
- One submit button
- One API route that accepts JSON input
- Client-side loading, success, and error states
- A landing-page link to the new demo
- Tests for the route and the client interaction

### Out of scope

- AGUI or CopilotKit orchestration for this flow
- Multiple fields
- Persistence
- Authentication
- Styling beyond matching the current project's simple card-based look

## Recommended approach

Use a dedicated App Router page with a small client component that calls a dedicated Route Handler via `fetch`.

This keeps the demo intentionally small, matches the existing Next.js app structure, and makes the client-to-server boundary explicit without reusing AGUI abstractions that would distract from the basic form flow.

## Architecture

### Page

- Add a new page at `/basic-form`
- The page explains that this is the simplest client/server example in the project
- The page renders a dedicated client component for the interactive form

### Client component

- Hold the input value in local state
- Trigger a `POST` request when the button is clicked
- Disable the button while the request is in flight
- Render:
  - validation or request errors
  - the echoed value returned by the server on success

### API route

- Add a new Route Handler at `/api/basic-form`
- Accept a JSON body with the shape `{ value: string }`
- Reject empty or whitespace-only values with a `400` response
- Return `{ received: value }` for valid input

## Data flow

1. The user types into the input.
2. The user clicks the button.
3. The client sends `POST /api/basic-form` with `{ value }`.
4. The server validates the payload and constructs the response.
5. The client renders the returned `received` value in the page.

## Error handling

- Empty input should not produce a success-shaped response
- The server returns a clear JSON error message for invalid input
- The client clears stale success data when a new request starts
- The client shows a readable error message if the request fails

## Testing

### Route tests

- Returns `400` when `value` is missing or blank
- Returns `200` and echoes the submitted value when valid

### Client tests

- Submitting a value sends the request and renders the echoed response
- The button shows loading state while the request is pending
- An error message appears when the route returns a failure

## File changes

- `src/app/basic-form/page.tsx`
- `src/components/basic-form-demo.tsx`
- `src/app/api/basic-form/route.ts`
- `src/app/page.tsx`
- Test files for the new route and component
