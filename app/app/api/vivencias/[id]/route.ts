import { createVivenciaByIdRouteHandlers } from '../handler'

const handlers = createVivenciaByIdRouteHandlers()

export const GET = handlers.GET
export const PUT = handlers.PUT
export const DELETE = handlers.DELETE
