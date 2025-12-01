import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_sidebar/calendar')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_sidebar/calendar"!</div>
}
