import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_sidebar/add-product')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_sidebar/add-product"!</div>
}
