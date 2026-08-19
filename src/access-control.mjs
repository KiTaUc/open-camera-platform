const permissions = {
  owner: ['camera:view', 'camera:manage', 'live:view', 'snapshot:view', 'snapshot:capture', 'recording:manage', 'archive:view', 'archive:manage', 'event:view', 'notification:view', 'ptz:control', 'user:manage', 'audit:view'],
  admin: ['camera:view', 'camera:manage', 'live:view', 'snapshot:view', 'snapshot:capture', 'recording:manage', 'archive:view', 'archive:manage', 'event:view', 'notification:view', 'ptz:control'],
  viewer: ['camera:view', 'live:view', 'snapshot:view', 'archive:view', 'event:view'],
};

export function can(role, permission) {
  return permissions[role]?.includes(permission) ?? false;
}

export function requirePermission(role, permission) {
  if (!can(role, permission)) throw new Error('Недостаточно прав для этого действия');
}
