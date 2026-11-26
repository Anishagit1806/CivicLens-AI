import { z } from 'zod';
import { getIssueById, updateIssueByAdmin } from '@/lib/data/repository';
import { handleApiError, jsonError, jsonOk, parseJsonBody } from '@/lib/http/responses';
import { getCurrentUser, requireAdmin } from '@/lib/security/session';
import { updateIssueAdminSchema } from '@/lib/validation/schemas';

const idParamSchema = z.string().uuid('Invalid issue identifier format.');

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const validId = idParamSchema.safeParse(id);
    if (!validId.success) {
      return jsonError('Invalid issue ID.', 400);
    }

    const user = await getCurrentUser();
    const record = await getIssueById(validId.data, user);
    if (!record) {
      return jsonError('Civic issue report not found.', 404);
    }

    return jsonOk(record);
  } catch (error) {
    return handleApiError(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const admin = await requireAdmin();
    const { id } = await context.params;
    const validId = idParamSchema.safeParse(id);
    if (!validId.success) {
      return jsonError('Invalid issue ID.', 400);
    }

    const body = await parseJsonBody(request);
    const parsed = updateIssueAdminSchema.parse(body);

    const updated = await updateIssueByAdmin({
      admin,
      issueId: validId.data,
      status: parsed.status,
      assignedDepartment: parsed.assignedDepartment,
      assignedToLabel: parsed.assignedToLabel,
      note: parsed.note,
      duplicateOfId: parsed.duplicateOfId,
    });

    if (!updated) {
      return jsonError('Civic issue report not found.', 404);
    }

    return jsonOk({ issue: updated });
  } catch (error) {
    return handleApiError(error);
  }
}
