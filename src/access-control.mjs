const permissions = {
  owner: ['camera:manage', 'recording:manage', 'archive:view', 'event:view', 'user:manage'],
  admin: ['camera:manage', 'recording:manage', 'archive:view', 'event:view'],
  viewer: ['archive:view', 'event:view'],
};

export function can(role, permission) {
  return permissions[role]?.includes(permission) ?? false;
}

export function requirePermission(role, permission) {
  if (!can(role, permission)) throw new Error('Недостаточно прав для этого действия');
}
