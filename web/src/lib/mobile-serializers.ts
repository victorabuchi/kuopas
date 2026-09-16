// Plain-JSON shapes matching kuopas-mobile/lib/types.ts field-for-field.
// Keep these two in sync by hand; there's no shared package between the
// repos yet.

type TenantRow = { id: string; name: string; pseudonym: string | null; email: string };

export function serializeTenant(tenant: TenantRow) {
  return { id: tenant.id, name: tenant.name, pseudonym: tenant.pseudonym, email: tenant.email };
}

type UnitRow = { id: string; code: string; floor: number };
type StairwellRow = { id: string; label: string; units: UnitRow[] };
type BuildingRow = { id: string; name: string; stairwells: StairwellRow[] };

export function serializeBuilding(building: BuildingRow) {
  return {
    id: building.id,
    name: building.name,
    stairwells: building.stairwells.map((stairwell) => ({
      id: stairwell.id,
      label: stairwell.label,
      units: stairwell.units.map((unit) => ({ id: unit.id, code: unit.code, floor: unit.floor })),
    })),
  };
}

type ChatGroupRow = { id: string; name: string; scope: string };

export function serializeChatGroup(group: ChatGroupRow) {
  return { id: group.id, name: group.name, scope: group.scope };
}

type MessageRow = { id: string; content: string; sentAt: string; sender: TenantRow };

export function serializeMessage(message: MessageRow) {
  return {
    id: message.id,
    content: message.content,
    sentAt: message.sentAt,
    sender: serializeTenant(message.sender),
  };
}

type CommentRow = { id: string; content: string; createdAt: string; author: TenantRow };

export function serializeComment(comment: CommentRow) {
  return {
    id: comment.id,
    content: comment.content,
    createdAt: comment.createdAt,
    author: serializeTenant(comment.author),
  };
}

type PostRow = {
  id: string;
  type: string;
  noticeboardCategory: string | null;
  title: string;
  titleEn: string | null;
  content: string;
  contentEn: string | null;
  photoUrl: string | null;
  createdAt: string;
  authorTenant: TenantRow | null;
  authorStaff: { id: string } | null;
  comments: CommentRow[];
  reactions: { tenantId: string }[];
};

export function serializePost(post: PostRow) {
  return {
    id: post.id,
    type: post.type,
    noticeboardCategory: post.noticeboardCategory,
    title: post.title,
    titleEn: post.titleEn,
    content: post.content,
    contentEn: post.contentEn,
    photoUrl: post.photoUrl,
    createdAt: post.createdAt,
    authorTenant: post.authorTenant ? serializeTenant(post.authorTenant) : null,
    authorStaff: post.authorStaff ? { id: post.authorStaff.id } : null,
    comments: post.comments.map(serializeComment),
    reactions: post.reactions.map((r) => ({ tenantId: r.tenantId })),
  };
}
