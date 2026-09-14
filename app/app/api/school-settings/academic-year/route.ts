import { createSchoolAcademicYearRouteHandlers } from './handler'

const handlers = createSchoolAcademicYearRouteHandlers()

export function GET(request: Request) {
  return handlers.GET(request)
}
export const PATCH = handlers.PATCH
