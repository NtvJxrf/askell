import AuditLog from '../databases/models/sklad/auditLog.model.js';

export async function auditHook(instance, options, changeType, entityName) {
  await AuditLog.create({
    entityName,
    entityId: instance.id,
    changedBy: options.userId,
    changedAt: new Date(),
    oldData: changeType === 'CREATE' ? null : instance._previousDataValues,
    newData: changeType === 'DELETE' ? null : instance.toJSON(),
    changeType,
  });
}
